/* eslint-disable camelcase */
import {Action, getModule, Module, Mutation, VuexModule,} from "vuex-module-decorators";
import rootStore from "../index";
import api from "@/api";
import {
  IgceEstimateDTO,
  ReferenceColumn,
  RequirementsCostEstimateFlat,
  RequirementsCostEstimateDTO, ContractTypeDTO
} from "@/api/models";
import _ from "lodash";
import Periods from "@/store/periods";
import DescriptionOfWork from "@/store/descriptionOfWork";
import AcquisitionPackage from "@/store/acquisitionPackage";
import ClassificationRequirements from "@/store/classificationRequirements";
import {AxiosRequestConfig} from "axios";

export const defaultRequirementsCostEstimate = (): RequirementsCostEstimateDTO => {
  return {
    acquisition_package: "",
    has_DOW_and_PoP: "",
    architectural_design_current_environment: {
      option: "",
      estimated_values: []
    },
    architectural_design_performance_requirements: {
      option: "",
      estimated_values: []
    },
    fee_specs: {
      is_charged: "",
      percentage: null
    },
    how_estimates_developed: {
      cost_estimate_description: "",
      previous_cost_estimate_comparison: {
        options: "",
        percentage: null
      },
      tools_used: "",
      other_tools_used: ""
    },
    optimize_replicate: {
      option: "",
      estimated_values: []
    },
    surge_requirements: {
      capabilities: "",
      capacity: null
    },
    training: [],
    travel: {
      option: "",
      estimated_values: []
    }
  }
}

export interface CostEstimate {
  labelShort: string,
  sysId: string,
  offerings: Record<string, string|boolean|number>[]
}

@Module({
  name: "IGCEStore",
  namespaced: true,
  dynamic: true,
  store: rootStore,
})
export class IGCEStore extends VuexModule {
  public requirementsCostEstimate: RequirementsCostEstimateDTO | null = null;
  public igceEstimateList: IgceEstimateDTO[] = [];

  @Action({rawError: true})
  public async reset(): Promise<void> {
    this.doReset();
  }

  costEstimates : CostEstimate[] = []

  @Mutation
  public doReset(): void {
    this.requirementsCostEstimate = _.cloneDeep(defaultRequirementsCostEstimate());
    this.igceEstimateList = [];
  }

  @Action
  public async getRequirementsCostEstimate(): Promise<RequirementsCostEstimateDTO> {
    return this.requirementsCostEstimate as RequirementsCostEstimateDTO;
  }

  @Action
  public async getRequirementsCostEstimateFlat(): Promise<RequirementsCostEstimateFlat> {
    return this.transformRequirementsCostEstimateFromTreeToFlat(
      this.requirementsCostEstimate as RequirementsCostEstimateDTO);
  }

  @Action
  public async setRequirementsCostEstimate(value: RequirementsCostEstimateDTO): Promise<void> {
    await this.doSetRequirementsCostEstimate(value);
    await this.saveRequirementsCostEstimate();
  }

  @Action
  public async setRequirementsCostEstimateFlat(value: RequirementsCostEstimateFlat): Promise<void> {
    await this.doSetRequirementsCostEstimate(
      await this.transformRequirementsCostEstimateFromFlatToTree(value));
    await this.saveRequirementsCostEstimate();
  }

  @Mutation
  public async doSetRequirementsCostEstimate(value: RequirementsCostEstimateDTO): Promise<void> {
    this.requirementsCostEstimate = this.requirementsCostEstimate
      ? Object.assign(this.requirementsCostEstimate, value)
      : value;
  }

  @Mutation
  public setHasDOWandPop(): void {
    const requirementCostEstimate = this.requirementsCostEstimate as RequirementsCostEstimateDTO;
    if ((Periods.periods && Periods.periods.length > 0) && !DescriptionOfWork.isIncomplete) {
      requirementCostEstimate.has_DOW_and_PoP = "YES";
    } else {
      requirementCostEstimate.has_DOW_and_PoP = "NO";
    }
  }

  @Action
  private async transformRequirementsCostEstimateFromFlatToTree(
    rceFlat: RequirementsCostEstimateFlat): Promise<RequirementsCostEstimateDTO> {
    return {
      acquisition_package: rceFlat.acquisition_package,
      architectural_design_current_environment: {
        option: rceFlat.architectural_design_current_environment_option,
        estimated_values:
        rceFlat.architectural_design_current_environment_estimated_values?.split(",")
      },
      architectural_design_performance_requirements: {
        option: rceFlat.architectural_design_performance_requirements_option,
        estimated_values:
          rceFlat.architectural_design_performance_requirements_estimated_values?.split(",")
      },
      fee_specs: {
        is_charged: rceFlat.contracting_office_other_charges_fee,
        percentage: rceFlat.contracting_office_other_fee_percentage
      },
      has_DOW_and_PoP: rceFlat.has_dow_and_pop,
      how_estimates_developed: {
        tools_used: rceFlat.how_est_dev_tools_used,
        other_tools_used: rceFlat.how_est_dev_other_tools_used,
        cost_estimate_description: rceFlat.how_est_dev_cost_estimate_description,
        previous_cost_estimate_comparison: {
          options: rceFlat.how_est_dev_prev_cost_estimate_comp_option,
          percentage: rceFlat.how_est_dev_prev_cost_estimate_comp_percentage
        },
      },
      optimize_replicate: {
        option: rceFlat.optimize_replicate_option,
        estimated_values: rceFlat.optimize_replicate_estimated_values?.split(",")
      },
      surge_requirements: {
        capabilities: rceFlat.surge_requirement_capabilities,
        capacity: rceFlat.surge_requirement_capacity},
      training: rceFlat.training ? JSON.parse(rceFlat.training) : [],
      travel: {
        option: rceFlat.travel_option,
        estimated_values: rceFlat.travel_estimated_values?.split(",")
      }
    };
  }

  @Action
  private async transformRequirementsCostEstimateFromTreeToFlat(
    rceTree: RequirementsCostEstimateDTO): Promise<RequirementsCostEstimateFlat> {
    return {
      acquisition_package: rceTree.acquisition_package,
      architectural_design_current_environment_option:
        rceTree.architectural_design_current_environment.option,
      architectural_design_current_environment_estimated_values:
        rceTree.architectural_design_current_environment.estimated_values?.toString(),
      architectural_design_performance_requirements_option:
        rceTree.architectural_design_performance_requirements.option,
      architectural_design_performance_requirements_estimated_values:
        rceTree.architectural_design_performance_requirements.estimated_values?.toString(),
      contracting_office_other_charges_fee: rceTree.fee_specs.is_charged,
      contracting_office_other_fee_percentage: rceTree.fee_specs.percentage,
      has_dow_and_pop: rceTree.has_DOW_and_PoP,
      how_est_dev_tools_used: rceTree.how_estimates_developed.tools_used,
      how_est_dev_other_tools_used: rceTree.how_estimates_developed.other_tools_used,
      how_est_dev_cost_estimate_description:
        rceTree.how_estimates_developed.cost_estimate_description,
      how_est_dev_prev_cost_estimate_comp_option:
        rceTree.how_estimates_developed.previous_cost_estimate_comparison.options,
      how_est_dev_prev_cost_estimate_comp_percentage:
        rceTree.how_estimates_developed.previous_cost_estimate_comparison.percentage,
      optimize_replicate_option: rceTree.optimize_replicate.option,
      optimize_replicate_estimated_values: rceTree.optimize_replicate.estimated_values?.toString(),
      surge_requirement_capacity: rceTree.surge_requirements.capacity,
      surge_requirement_capabilities: rceTree.surge_requirements.capabilities,
      training: JSON.stringify(rceTree.training ? rceTree.training : []),
      travel_option: rceTree.travel.option,
      travel_estimated_values: rceTree.travel.estimated_values?.toString()
    }
  }

  @Action
  public async initializeRequirementsCostEstimate(): Promise<void> {
    await this.doSetRequirementsCostEstimate(
      await this.transformRequirementsCostEstimateFromFlatToTree(
        await api.requirementsCostEstimateTable
          .create(await this.transformRequirementsCostEstimateFromTreeToFlat(
            defaultRequirementsCostEstimate()))));
  }

  /**
   * Saves requirements cost estimate record that is in the store and sets the context. The
   * caller has to ensure that the store data is updated before calling this function.
   */
  @Action({rawError: true})
  public async saveRequirementsCostEstimate(): Promise<boolean> {
    try {
      const storeRequirementsCostEstimate = await this.getRequirementsCostEstimate();
      const updatedReqCostEstimate = await api.requirementsCostEstimateTable
        .update(storeRequirementsCostEstimate.sys_id as string,
          await this.transformRequirementsCostEstimateFromTreeToFlat(
            storeRequirementsCostEstimate));
      storeRequirementsCostEstimate.sys_updated_on = updatedReqCostEstimate.sys_updated_on;
      storeRequirementsCostEstimate.sys_updated_by = updatedReqCostEstimate.sys_updated_by;
      return true;
    } catch (error) {
      throw new Error(`an error occurred saving requirements cost estimate ${error}`);
    }
  }

  /**
   * Loads the Requirements cost estimate data using the acquisition package sys id.
   * And then sets the context such that the data could be retrieved using the
   * getters (getRequirementsCostEstimate)
   * @param packageId - sys_id of the acquisition package table record
   */
  @Action({rawError: true})
  public async loadRequirementsCostEstimateDataByPackageId(packageId: string): Promise<void> {
    const rceRequestConfig: AxiosRequestConfig = {
      params: {
        sysparm_query: "^acquisition_packageIN" + packageId
      }
    };
    const reqCostEstimateList = await api.requirementsCostEstimateTable.getQuery(rceRequestConfig);
    if(reqCostEstimateList.length > 0){
      const sysId = typeof reqCostEstimateList[0].acquisition_package === "object"
        ? reqCostEstimateList[0].acquisition_package.value as string
        : reqCostEstimateList[0].acquisition_package as string;
      await this.doSetRequirementsCostEstimate({
        ...await this.transformRequirementsCostEstimateFromFlatToTree(reqCostEstimateList[0]),
        acquisition_package: sysId
      });
    } else {
      await this.initializeRequirementsCostEstimate();
    }
  }

  /**
   * Loads the igce estimate data using the acquisition package sys id.
   * And then sets the context such that the data could be retrieved using the
   * getters (getIgceCostEstimate)
   * @param packageId - sys_id of the acquisition package table record
   */
  @Action({rawError: true})
  public async loadIgceEstimateByPackageId(packageId: string): Promise<void> {
    const rceRequestConfig: AxiosRequestConfig = {
      params: {
        sysparm_query: "^acquisition_packageIN" + packageId
      }
    };
    const igceEstimateList = await api.igceEstimateTable.getQuery(rceRequestConfig);
    await this.doSetIgceEstimate(igceEstimateList);
  }

  /**
   * Gathers all the required reference column Ids, calculates the quantity based on periods, makes
   * a callout to save and the sets the igce estimate to this store.
   */
  @Action({rawError: true})
  public async setCostEstimate(value: CostEstimate[]): Promise<void> {
    const aqPackageSysId = AcquisitionPackage.acquisitionPackage?.sys_id as string;
    const crossDomainSysId = ClassificationRequirements.cdsSolution?.sys_id as string;
    let contractTypeChoice = "TBD";
    const contractType: ContractTypeDTO = AcquisitionPackage.contractType as ContractTypeDTO;
    if (contractType?.firm_fixed_price === "true") {
      contractTypeChoice = "FFP";
    } else if (contractType?.time_and_materials === "true") {
      contractTypeChoice = "T&M";
    }
    const periods = Periods.periods;
    let quantityCalculated = 0;
    periods.forEach(period => {
      if(period.period_unit === "MONTH") {
        quantityCalculated = quantityCalculated + Number(period.period_unit_count);
      } else if (period.period_unit === "YEAR") {
        quantityCalculated = quantityCalculated + (Number(period.period_unit_count) * 12);
      }
    })
    await this.saveIgceEstimates(
      {
        costEstimatList: value,
        aqPackageSysId: aqPackageSysId,
        crossDomainSysId: crossDomainSysId,
        contractTypeChoice: contractTypeChoice,
        quantity: quantityCalculated
      });
    await this.loadIgceEstimateByPackageId(aqPackageSysId);
  }

  @Mutation
  public async doSetIgceEstimate(igceEstimateList: IgceEstimateDTO[]): Promise<void> {
    this.igceEstimateList = igceEstimateList;
  }

  @Action({rawError: true})
  public async saveIgceEstimates(saveIgceObject: {
    costEstimatList: CostEstimate[],
    aqPackageSysId: string,
    crossDomainSysId: string,
    contractTypeChoice: string,
    quantity: number
  }): Promise<void>{
    const apiCallList: Promise<IgceEstimateDTO>[] = [];
    saveIgceObject.costEstimatList.forEach(costEstimate => {
      costEstimate.offerings.forEach(offering => {
        const igceEstimateSysId = offering.igceEstimateSysId as string;
        const igceEstimate: IgceEstimateDTO = {
          acquisition_package: saveIgceObject.aqPackageSysId,
          classification_instance: offering.sysId as string,
          // TODO: top level sys_id should have been class instance. "repetition of sys_id property
          //  names inside CostEstimate object is confusing. We should rename to explicit prefixes.
          //  Line above and below this comment should be updated after sys_id prop name refactor.
          // classification_instance: costEstimate.sysId,
          contract_type: saveIgceObject.contractTypeChoice,
          cross_domain_solution: saveIgceObject.crossDomainSysId,
          quantity: saveIgceObject.quantity,
          // TODO: By using
          //  IgceEstimate object or renaming the existing CostEstimate props, there won't be any
          //  confusion regarding what each sys_id is mapping to.
          selected_service_offering: offering.sysId as string, // FIXME: This mapping is incorrect.
          description: offering.IGCE_description as string,
          title: offering.IGCE_title as string,
          unit: "MONTHS",
          unit_price: offering.monthly_price as number
        }
        if(igceEstimateSysId && igceEstimateSysId.length > 0) {
          apiCallList.push(api.igceEstimateTable.update(igceEstimateSysId, igceEstimate));
        } else {
          apiCallList.push(api.igceEstimateTable.create(igceEstimate));
        }
      })
    })
    await Promise.all(apiCallList);
  }
}

const IGCE = getModule(IGCEStore);
export default IGCE;
