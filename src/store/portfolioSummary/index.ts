/* eslint-disable camelcase */
import {CloudServiceProviderDTO, PortfolioSummaryDTO, PortfolioSummarySearchDTO,
  ReferenceColumn} from "@/api/models";
import {Action, getModule, Module, Mutation, VuexModule} from "vuex-module-decorators";
import rootStore from "@/store";
import {nameofProperty, retrieveSession, storeDataToSession} from "@/store/helpers";
import Vue from "vue";
import {api} from "@/api";
import {AxiosRequestConfig} from "axios";

const ATAT_PORTFOLIO_SUMMARY_KEY = "ATAT_PORTFOLIO_SUMMARY_KEY";

@Module({
  name: "PortfolioSummaryStore",
  namespaced: true,
  dynamic: true,
  store: rootStore,
})
export class PortfolioSummaryStore extends VuexModule {
  initialized = false;
  portfolioSummaryList: PortfolioSummaryDTO[] | null = null;

  @Action
  public async getAllPortfolioSummaryList(): Promise<PortfolioSummaryDTO[] | null> {
    return this.portfolioSummaryList;
  }

  // store session properties
  protected sessionProperties: string[] = [
    nameofProperty(this, (x) => x.portfolioSummaryList)
  ];

  @Mutation
  public setStoreData(sessionData: string): void {
    try {
      const sessionDataObject = JSON.parse(sessionData);
      Object.keys(sessionDataObject).forEach((property) => {
        Vue.set(this, property, sessionDataObject[property]);
      });
    } catch (error) {
      throw new Error("error restoring session for portfolio summary data store");
    }
  }

  @Mutation
  public setInitialized(value: boolean): void {
    this.initialized = value;
  }

  @Mutation
  public setPortfolioSummaryList(value: PortfolioSummaryDTO[]): void {
    this.portfolioSummaryList = value;
    storeDataToSession(
      this,
      this.sessionProperties,
      ATAT_PORTFOLIO_SUMMARY_KEY
    );
  }

  @Action({rawError: true})
  async initialize(): Promise<void> {
    const sessionRestored = retrieveSession(ATAT_PORTFOLIO_SUMMARY_KEY);
    if (sessionRestored) {
      this.setStoreData(sessionRestored);
      this.setInitialized(true);
    }
  }

  @Action({rawError: true})
  async ensureInitialized(): Promise<void> {
    await this.initialize();
  }

  /**
   * Constructs a single query that gets all the CSP records across all the portfolis. Parses
   * the response and sets the 'csp_display' to the respective portfolio.
   */
  @Action({rawError: true})
  private async setCspDisplay(portfolioSummaryList: PortfolioSummaryDTO[]) {
    const cspSysIds = portfolioSummaryList.map(portfolio => portfolio.csp.value);
    const allCspList = await api.cloudServiceProviderTable.getQuery(
      {
        params:
          {
            sysparm_fields: "sys_id,name",
            sysparm_query: "sys_idIN" + cspSysIds
          }
      }
    )
    portfolioSummaryList.forEach(portfolio => {
      portfolio.csp_display =
        (allCspList.find(
          (csp: CloudServiceProviderDTO) => portfolio.csp.value === csp.sys_id)?.name) || "";
    });
  }

  /**
   * Given a list of portfolios, compiles the api calls and returns the portfolio list
   * with task orders populated.
   */
  @Action({rawError: true})
  private async setTaskOrdersForPortfolios(portfolioSummaryList: PortfolioSummaryDTO[]):
    Promise<PortfolioSummaryDTO[]> {
    const allTaskOrderList = await api.taskOrderTable.getQuery(
      {
        params:
          {
            sysparm_fields:
              "sys_id,clins,portfolio,task_order_number,task_order_status," +
              "pop_end_date,pop_start_date",
            sysparm_query: "portfolio.nameIN" + portfolioSummaryList
              .map(portfolio => portfolio.name)
          }
      }
    )
    portfolioSummaryList.forEach(portfolio => {
      portfolio.task_orders = allTaskOrderList
        .filter((taskOrder) => {
          const portfolioSysId = (taskOrder.portfolio as ReferenceColumn).value;
          return portfolioSysId === portfolio.sys_id
        });

      if (!portfolio.task_orders) {
        portfolio.task_orders = [];
      }
    })
    return portfolioSummaryList;
  }

  /**
   * Constructs a single query that get all the clins records across all the task orders. Parses
   * the response and sets the clins to the respective task order.
   */
  @Action({rawError: true})
  private async setClinsToPortfolioTaskOrders(portfolioSummaryList: PortfolioSummaryDTO[]) {
    const clins = portfolioSummaryList.map(portfolio => portfolio.task_orders
      .map(taskOrder => taskOrder.clins));
    const allClinList = await api.clinTable.getQuery(
      {
        params:
          {
            sysparm_fields: "sys_id,clin_number,clin_status,funds_obligated",
            sysparm_query: "sys_idIN" + clins
          }
      }
    )
    portfolioSummaryList.forEach(portfolio => {
      portfolio.task_orders.forEach(taskOrder => {
        taskOrder.clin_records =
          allClinList.filter(clin => (taskOrder.clins.indexOf(<string>clin.sys_id) !== -1));
      })
    })
  }

  /**
   * Constructs a single query that gets all the cost records across all the clins. Parses
   * the response and sets the costs to the respective clin.
   */
  @Action({rawError: true})
  private async setCostsToTaskOrderClins(portfolioSummaryList: PortfolioSummaryDTO[]) {
    const clinNumbers: string[] = [];
    portfolioSummaryList.forEach(portfolio => {
      portfolio.task_orders.forEach(taskOrder => {
        taskOrder.clin_records?.forEach(clinRecord => {
          clinNumbers.push(clinRecord.clin_number);
        })
      })
    });
    const allCostList = await api.costsTable.getQuery(
      {
        params:
          {
            sysparm_fields: "sys_id,clin,task_order_number,is_actual,value",
            sysparm_query: "clinIN" + clinNumbers
          }
      }
    )
    portfolioSummaryList.forEach(portfolio => {
      portfolio.task_orders.forEach(taskOrder => {
        taskOrder.clin_records?.forEach(clinRecord => {
          clinRecord.cost_records =
            allCostList.filter(cost => {
              const clinNumber = cost.clin as unknown as string;
              return clinNumber === clinRecord.clin_number &&
                cost.task_order_number === taskOrder.task_order_number
            }); // FIXME temp code above
          // allCostList.filter(cost => cost.clin?.value === clinRecord.sys_id);//FIXME correct code
        })
      })
    })
  }

  /**
   * Performs the 'Total Obligated' and 'Funds Spent' for all the portfolios in the list
   *
   * NOTE: Instead of computing here if we were to make the aggregate API call, it would take
   * as many calls as the number of portfolios to get, for example, the 'Total Obligated' from
   * the CLINS table. The reason for this is, the aggregate query response does not have any
   * reference to what portfolio the aggregate belongs to and so a call for each portfolio.
   * Computing here will eliminate all these calls.
   */
  @Action({rawError: true})
  private computeAllAggregations(portfolioSummaryList: PortfolioSummaryDTO[]) {
    portfolioSummaryList.forEach(portfolio => {
      portfolio.dod_component = 'ARMY' // FIXME: delete this line after API starts returning
      let totalObligatedForPortfolio = 0;
      let totalFundsSpentForPortfolio = 0;
      portfolio.task_orders.forEach(taskOrder => {
        taskOrder.clin_records?.forEach(clinRecord => {
          if (clinRecord.clin_status === 'ACTIVE' ||
            clinRecord.clin_status === 'OPTION_EXERCISED') { // TODO: double check the statuses
            totalObligatedForPortfolio =
              totalObligatedForPortfolio + Number(clinRecord.funds_obligated);
          }
          clinRecord.cost_records?.forEach(costRecord => {
            totalFundsSpentForPortfolio = totalFundsSpentForPortfolio + Number(costRecord.value);
          })
        })
      })
      portfolio.funds_obligated = totalObligatedForPortfolio;
      portfolio.funds_spent = totalFundsSpentForPortfolio;
    })
  }

  @Action({rawError: true})
  private async loadPortfolioSummaryList(searchQuery: string): Promise<PortfolioSummaryDTO[]> {
    await this.ensureInitialized();
    try {
      // const query =
      //   "portfolio_managersLIKEe0c4c728875ed510ec3b777acebb356"; // pragma: allowlist secret
      const portfolioSummaryListRequestConfig: AxiosRequestConfig = {
        params: {
          sysparm_query: searchQuery
        }
      };
      const portfolioSummaryList =
        await api.portfolioTable.getQuery(portfolioSummaryListRequestConfig);
      if (portfolioSummaryList && portfolioSummaryList.length > 0) {
        // callouts to other functions to set data from other tables
        await this.setCspDisplay(portfolioSummaryList);
        await this.setTaskOrdersForPortfolios(portfolioSummaryList);
        await this.setClinsToPortfolioTaskOrders(portfolioSummaryList);
        await this.setCostsToTaskOrderClins(portfolioSummaryList);
        // all asynchronous calls are done before this step & data is available for aggregation
        this.computeAllAggregations(portfolioSummaryList);
        this.setPortfolioSummaryList(portfolioSummaryList); // caches the list
        return portfolioSummaryList;
      } else {
        return [];
      }
    } catch (error) {
      throw new Error("error occurred loading portfolio summary list :" + error);
    }
  }

  /**
   * Compiles a search query string for the optional search parameters of 'portfolio' table.
   */
  @Action({rawError: true})
  private async getOptionalSearchParameterQuery(searchDTO: PortfolioSummarySearchDTO):
    Promise<string> {
    let query = "";
    if (searchDTO.portfolioStatus) {
      query = query + "^portfolio_statusIN" + searchDTO.portfolioStatus;
    }
    if (searchDTO.searchString) {
      query = query + "^nameLIKE" + searchDTO.searchString;
    }
    if (searchDTO.csps?.length > 0) {
      query = query + "^csp.nameIN" + searchDTO.csps;
    }
    // TODO: handle 'fundingstatuses' - QUESTION: Is the column for this in portfolio table
    return query;
  }

  /**
   * Compiles a search query string for the mandatory search parameters of 'portfolio' table. For
   * each search parameter, no need to check if the value exists since the value is mandatory.
   */
  @Action({rawError: true})
  private async getMandatorySearchParameterQuery(searchDTO: PortfolioSummarySearchDTO):
    Promise<string> {
    let query = "";
    if (searchDTO.role === "ALL") {
      query = query +
        "^portfolio_managersLIKEe0c4c728875ed510ec3b777acebb356^OR" + // pragma: allowlist secret
        "portfolio_viewersLIKEe0c4c728875ed510ec3b777acebb356"; // pragma: allowlist secret
    } else { // "MANAGED"
      query = query +
        "^portfolio_managersLIKEe0c4c728875ed510ec3b777acebb356"; // pragma: allowlist secret
    }
    query = query + "^ORDERBY" + searchDTO.sort;
    return query;
  }

  /**
   * Makes a callout to get the portfolio search queries and then loads the portfolio list
   * by concatenating the search queries
   *
   * TODO: In a future story performance can be improved by eliminating the calls to all
   *  the referenced tables on each search variable change. Strategy is to load all the
   *  portfolios the user can view OR manage and cache the data. On subsequence searches
   *  just make one call to the portfolio table using the search values and use the
   *  response to filter the results from the cached portfolio list. Since the cached results
   *  already have the referenced data, no further call needs to be made.
   *  Clubbing this story into the existing story will increase the scope and delay the testing
   *  of this story.
   */
  @Action({rawError: true})
  public async searchPortfolioSummaryList(searchDTO: PortfolioSummarySearchDTO):
    Promise<PortfolioSummaryDTO[]> {
    const optionalSearchQuery = await this.getOptionalSearchParameterQuery(searchDTO);
    const mandatorySearchQuery = await this.getMandatorySearchParameterQuery(searchDTO)
    if (optionalSearchQuery.length > 0) {
      return this.loadPortfolioSummaryList(
        optionalSearchQuery + mandatorySearchQuery);
    } else {
      return this.loadPortfolioSummaryList(mandatorySearchQuery);
    }
  }
}

const PortfolioSummary = getModule(PortfolioSummaryStore);
export default PortfolioSummary;

