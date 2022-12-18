/* eslint-disable camelcase */
import {Action, getModule, Module, Mutation, VuexModule,} from "vuex-module-decorators";
import rootStore from "../index";
import api from "@/api";
import {RequirementsCostEstimateDTO} from "@/api/models";
import _ from "lodash";
import Periods from "@/store/periods";
import DescriptionOfWork from "@/store/descriptionOfWork";

export const defaultRequirementsCostEstimate = (): RequirementsCostEstimateDTO => {
  return {
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
  offerings: Record<string, string|number|boolean>[]
}

@Module({
  name: "IGCEStore",
  namespaced: true,
  dynamic: true,
  store: rootStore,
})
export class IGCEStore extends VuexModule {
  public requirementsCostEstimate: RequirementsCostEstimateDTO | null = null;

  public igceTrainingIndex: number | null = null;

  @Action({rawError: true})
  public async reset(): Promise<void> {
    this.doReset();
  }

  costEstimates : CostEstimate[] = []

  @Mutation
  public doReset(): void {
    this.requirementsCostEstimate = _.cloneDeep(defaultRequirementsCostEstimate());
    this.igceTrainingIndex = null;
  }

  @Action
  public async getRequirementsCostEstimate(): Promise<RequirementsCostEstimateDTO> {
    return this.requirementsCostEstimate as RequirementsCostEstimateDTO;
  }

  @Action
  public async setRequirementsCostEstimate(value: RequirementsCostEstimateDTO): Promise<void> {
    await this.doSetRequirementsCostEstimate(value);
    await this.saveRequirementsCostEstimate();
  }

  @Mutation
  public setIgceTrainingIndex(value: number | null): void {
    this.igceTrainingIndex = value;
  }

  @Mutation
  public async doSetRequirementsCostEstimate(value: RequirementsCostEstimateDTO): Promise<void> {
    this.requirementsCostEstimate = this.requirementsCostEstimate
      ? Object.assign(this.requirementsCostEstimate, value)
      : value;
  }

  @Action({ rawError: true })
  public async doSetCostEstimate(value: CostEstimate[]): Promise<void> {
    await this.setCostEstimate(value)
  }
  @Mutation
  public async setCostEstimate(value: CostEstimate[]): Promise<void> {
    this.costEstimates = value;
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

  // TODO: write other setters and getters as needed.

  @Action
  public async initializeRequirementsCostEstimate(): Promise<void> {
    await this.doInitializeRequirementsCostEstimate();
  }

  @Mutation
  public async doInitializeRequirementsCostEstimate(): Promise<void> {
    // TODO: need to initialize this in SNOW by making api call. Then set the response from snow
    this.requirementsCostEstimate = _.cloneDeep(defaultRequirementsCostEstimate());
    // TODO: other initializations outside of requirements cost estimate
  }


  /**
   * Loads the Requirements cost estimate data using the acquisition package sys id.
   * And then sets the context such that the data could be retrieved using the
   * getters (getRequirementsCostEstimate)
   * @param reqCostEstimateSysId - sys_id of the acquisition package table record
   */
  @Action({rawError: true})
  public async loadRequirementsCostEstimateDataById(reqCostEstimateSysId: string): Promise<void> {
    const requirementsCostEstimate = await api.requirementsCostEstimateTable
      .retrieve(reqCostEstimateSysId);
    if (requirementsCostEstimate) {
      await this.doSetRequirementsCostEstimate(requirementsCostEstimate);
    } else {
      await this.initializeRequirementsCostEstimate();
    }
  }

  /**
   * Saves requirements cost estimate record that is in the store and sets the context. The
   * caller has to ensure that the store data is updated before calling this function.
   */
  @Action({rawError: true})
  public async saveRequirementsCostEstimate(): Promise<boolean> {
    return true;
    /*try {
      // TODO: perform any data transformation using spread construct.
      // TODO: uncomment below 4 statements after SNOW table update
      /!*const storeRequirementsCostEstimate = await this.getRequirementsCostEstimate();
      const updatedReqCostEstimate = await api.requirementsCostEstimateTable
        .update(storeRequirementsCostEstimate.sys_id as string, storeRequirementsCostEstimate);
      storeRequirementsCostEstimate.sys_updated_on = updatedReqCostEstimate.sys_updated_on;
      storeRequirementsCostEstimate.sys_updated_by = updatedReqCostEstimate.sys_updated_by;*!/
      return true;
    } catch (error) {
      throw new Error(`an error occurred saving requirements cost estimate ${error}`);
    }*/
  }
}

const IGCE = getModule(IGCEStore);
export default IGCE;
