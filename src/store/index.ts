// https://codeburst.io/vuex-and-typescript-3427ba78cfa8

import Vue from "vue";
import Vuex from "vuex";
import VuexPersist from "vuex-persist";
import { Navs } from "../../types/NavItem";
import { Dialog, Toast } from "types/Global";
import {
  Application,
  ApplicationModel,
  Environment,
  Operator,
  OperatorModel,
  TaskOrder,
} from "types/Portfolios";
import { portfoliosApi } from "@/api";
import { TaskOrderModel } from "types/Wizard";
import { generateUid, getEntityIndex } from "@/helpers";
import { mockTaskOrders } from "./mocks/taskOrderMockData";
import moment from "moment";

import portfolios from "./modules/portfolios/store";
import applications from "./modules/applications/store";
import taskOrders from "./modules/taskOrders/store";

import {
  validateApplication,
  validOperator,
  validateHasAdminOperators
} from "@/validation/application";

Vue.use(Vuex);

const vuexLocalStorage = new VuexPersist({
  key: "vuex", // The key to store the state on in the storage provider.
  storage: window.sessionStorage, // or window.sessionStorage or localForage
  // Function that passes the state and returns the state with only the objects you want to store.
  // reducer: state => state,
  // Function that passes a mutation and lets you decide if it should update the state in localStorage.
  // filter: mutation => (true)
});

const createStepOneModel = () => {
  return {
    model: {
      name: "",
      description: "",
      dod_components: [],
      csp: "",
    },
  };
};

const createStepTwoModel = () => {
  return {
    id: "",
    task_order_number: "",
    task_order_file: {
      description: "",
      id: "",
      crated_at: "",
      updated_at: "",
      size: 0,
      name: "",
      status: "",
    },
    clins: [
      {
        clin_number: "",
        idiq_clin: "",
        total_clin_value: 0,
        obligated_funds: 0,
        pop_start_date: "",
        pop_end_date: "",
      },
    ],
  };
};

const createStepThreeModel = () => {
  return {
    id: "",
    name: "",
    description: "",
    operators: [],
    environments: [
      {
        name: "Development",
        id: generateUid(),
        operators: [],
      },
      {
        name: "Testing",
        id: generateUid(),
        operators: [],
      },
      {
        name: "Staging",
        id: generateUid(),
        operators: [],
      },
      {
        name: "Production",
        id: generateUid(),
        operators: [],
      },
    ],
  };
};

const createStepFourModel = () => {
  return {};
};

const createStepFiveModel = () => {
  return {};
};

const stepsModelInitializer = [
  {
    step: 1,
    model: createStepOneModel,
  },
  {
    step: 2,
    model: createStepTwoModel,
  },
  {
    step: 3,
    model: createStepThreeModel,
  },
  {
    step: 4,
    model: createStepFourModel,
  },
  {
    step: 5,
    model: createStepFiveModel,
  },
];

const mapTaskOrders = (taskOrderModels: TaskOrderModel[]): TaskOrder[] => {
  return taskOrderModels.map((model: TaskOrderModel) => {
    //extract all properties except the id
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, signed, ...baseModel } = model;

    const taskOrders: TaskOrder = {
      ...baseModel,
      task_order_file: {
        id: model.task_order_file.id,
        name: model.task_order_file.name,
      },
      clins: model.clins.map((clin) => {
        return {
          ...clin,
          total_clin_value: parseNumber(clin.total_clin_value.toString()),
          obligated_funds: parseNumber(clin.obligated_funds.toString()),
          pop_start_date: moment(clin.pop_start_date).format("YYYY-MM-DD"),
          pop_end_date: moment(clin.pop_end_date).format("YYYY-MM-DD"),
        };
      }),
    };

    return taskOrders;
  });
};

const mapApplications = (
  applicationModels: ApplicationModel[]
): Application[] => {
  return applicationModels.map((model: ApplicationModel) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...baseModel } = model;
    const application: Application = {
      ...baseModel,
      operators: model.operators
        ? model.operators.map((op) => {
            return {
              access: op.access,
              display_name: op.display_name,
              email: op.email,
            };
          })
        : [],
      environments: model.environments.map((env) => {
        return {
          name: env.name,
          operators: env.operators
            ? env.operators.map((op) => {
                return {
                  access: op.access,
                  display_name: op.display_name,
                  email: op.email,
                };
              })
            : [],
        };
      }),
    };

    return application;
  });
};

const mapOperators = (operatorsModels: OperatorModel[]): Operator[] => {
  return operatorsModels.map((operatorModel: OperatorModel) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...baseModel } = operatorModel;

    const operator: Operator = {
      ...baseModel,
    };

    return operator;
  });
};

const StepModelIndices: Record<number, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
};

const parseNumber = (value: string) => {
  value = value.replace(",", "");
  const num = parseFloat(value);

  return num;
};

const stepModelHasData = (stepModel: any, initialModel: any) => {
  return JSON.stringify(stepModel) !== JSON.stringify(initialModel);
};

/*
█████████████████████████████████████████

███████ ████████  █████  ████████ ███████
██         ██    ██   ██    ██    ██
███████    ██    ███████    ██    █████
     ██    ██    ██   ██    ██    ██
███████    ██    ██   ██    ██    ███████

█████████████████████████████████████████
*/

export default new Vuex.Store({
  plugins: [vuexLocalStorage.plugin],
  state: {
    loginStatus: false,
    sideDrawerIsOpen: false,
    sideDrawerType: "",
    sideDrawerOpenerId: "",
    sideDrawerChange: false,
    isUserAuthorizedToProvisionCloudResources: false,
    isNavSideBarDisplayed: false,
    dialog: {
      isDisplayed: false,
      type: "",
      setFocus: false,
      width: "",
      height: "",
      props: null,
    },
    taskOrderModels: [],
    wizardNavigation: {},
    erroredSteps: [],
    currentStepNumber: 1,
    currentPortfolioId: "",
    currentApplicationId: "",
    currentStepModel: {},
    portfolioSteps: [
      {
        step: 1,
        description: "Create Portfolio",
        touched: false,
        valid: false,
        model: {
          name: "",
          description: "",
          dod_components: [],
          csp: "",
        },
      },
      {
        step: 2,
        description: "Add Funding",
        touched: false,
        valid: false,
        model: {
          index: 0, //local guid
          task_order_number: "",
          task_order_file: {
            description: "",
            id: "",
            created_at: "",
            updated_at: "",
            size: 0,
            name: "",
            status: "",
          },
          clins: [],
        },
      },
      {
        step: 3,
        description: "Add Application",
        touched: false,
        valid: false,
        model: {
          id: "",
          name: "",
          description: "",
          operators: [],
          environments: [
            {
              name: "Development",
              id: generateUid(),
              operators: [],
            },
            {
              name: "Testing",
              id: generateUid(),
              operators: [],
            },
            {
              name: "Staging",
              id: generateUid(),
              operators: [],
            },
            {
              name: "Production",
              id: generateUid(),
              operators: [],
            },
          ],
        },
      },
      {
        step: 4,
        description: "Add Team Members",
        touched: false,
        valid: false,
        hasChanges: false,
        model: {},
      },
      {
        step: 5,
        description: "Review and Submit",
        touched: false,
        valid: false,
        model: {},
      },
    ],
    membersModified: false,
    user: {
      title: "",
      given_name: "",
      family_name: "",
      email: "",
      phone_number: "",
      service_branch: "",
      citizenship: "",
      dod_id: "",
      designation: "",
    },
    validationStamp: {},
    toast: {
      isDisplayed: false,
      message: "",
      contentClass: "",
    },
    returnToReviewAndSubmit: false,
  },
  /*
  ███████████████████████████████████████████████████████████████████████████

  ███    ███ ██    ██ ████████  █████  ████████ ██  ██████  ███    ██ ███████
  ████  ████ ██    ██    ██    ██   ██    ██    ██ ██    ██ ████   ██ ██
  ██ ████ ██ ██    ██    ██    ███████    ██    ██ ██    ██ ██ ██  ██ ███████
  ██  ██  ██ ██    ██    ██    ██   ██    ██    ██ ██    ██ ██  ██ ██      ██
  ██      ██  ██████     ██    ██   ██    ██    ██  ██████  ██   ████ ███████

  ███████████████████████████████████████████████████████████████████████████
  */
  mutations: {
    changeLoginStatus(state, status: boolean) {
      state.loginStatus = status;
    },
    changeUser(state, user: any) {
      // These attributes will come across directly and cleanly from the
      // u[stream identity provider and Cognito
      state.user.given_name = user?.given_name ?? "";
      state.user.family_name = user?.family_name ?? "";
      state.user.email = user?.email ?? "Not Provided";
      // This field will have to be a custom Cognito attribute and so
      // the source object may have a different format.
      state.user.dod_id = user?.["custom:dod_id"] ?? "1234567890";
      state.user.citizenship = user?.["custom:citizenship"] ?? "United States";
      state.user.designation = user?.["custom:designation"] ?? "Civilian";
      // This field may not be available from our identity provider
      state.user.phone_number = user?.phone ?? "(555) 555-5555";
      // There is not currently a known way to get this information from
      // the identity provider.
      state.user.service_branch = "U.S. Army";
      state.user.title = "Ms.";
    },
    changeDialog(state, dialogProps: Dialog) {
      state.dialog = dialogProps;
    },
    doCloseSideDrawer(state) {
      state.sideDrawerIsOpen = false;
      state.sideDrawerChange = !state.sideDrawerChange;
    },
    doOpenSideDrawer(state, [drawerType, openerId]) {
      state.sideDrawerIsOpen = true;
      state.sideDrawerType = drawerType;
      state.sideDrawerOpenerId = openerId;
      state.sideDrawerChange = !state.sideDrawerChange;
    },
    changeisUserAuthorizedToProvisionCloudResources(state, status: boolean) {
      state.isUserAuthorizedToProvisionCloudResources = status;
    },
    setStepValidated(state, step: number) {
      state.erroredSteps = state.erroredSteps.filter((es) => es !== step);
    },
    doSetCurrentStepNumber(state, step: number) {
      state.currentStepNumber = step;
    },
    doSetCurrentStepModel(state, model: any) {
      state.currentStepModel = { ...model };
    },
    /**
     * commits set model to the store - does not make api call
     * @param state
     * @param param1
     */
    doSaveStepModel(state, [model, stepNumber, stepIndex, valid]) {
      Vue.set(state.portfolioSteps[stepIndex], "model", model);
      Vue.set(state.portfolioSteps[stepIndex], "valid", valid);
      Vue.set(state.portfolioSteps[stepIndex], "touched", true);

      const es: number[] = state.erroredSteps;
      const erroredStepIndex = es.indexOf(stepNumber);
      if (erroredStepIndex > -1 && valid) {
        es.splice(erroredStepIndex, 1);
      } else if (erroredStepIndex === -1 && !valid) {
        es.push(stepNumber);
      }
    },
    /**
     * commits set model to the store - does not make api call
     * @param state
     * @param param1
     */
    doInitializeStepModel(state, [model, stepIndex]) {
      Vue.set(state.portfolioSteps[stepIndex], "model", model);
      Vue.set(state.portfolioSteps[stepIndex], "valid", true);
      Vue.set(state.portfolioSteps[stepIndex], "touched", false);
    },
    doUpdateStepModelValidity(state, [stepNumber, stepIndex, valid]) {
      Vue.set(state.portfolioSteps[stepIndex], "valid", valid);
      Vue.set(state.portfolioSteps[stepIndex], "touched", true);

      const es: number[] = state.erroredSteps;
      const erroredStepIndex = es.indexOf(stepNumber);
      if (erroredStepIndex > -1 && valid) {
        es.splice(erroredStepIndex, 1);
      } else if (erroredStepIndex === -1 && !valid) {
        es.push(stepNumber);
      }
    },
    doSetStepTouched(state, [stepIndex, isTouched]) {
      Vue.set(state.portfolioSteps[stepIndex], "touched", isTouched);
    },
    doUpdateMembersModified(state, added: boolean) {
      state.membersModified = added;
    },
    /**
     * Partially or fully initializes step model
     * @param state
     * @param stepNumber
     */
    doInitializeSteps(state) {
      const initial = [...stepsModelInitializer];

      initial.forEach((step) => {
        const stepIndex = state.portfolioSteps.findIndex(
          (x) => x.step === step.step
        );

        Vue.set(state.portfolioSteps[stepIndex], "model", step.model());
        Vue.set(state.portfolioSteps[stepIndex], "valid", true);
        Vue.set(state.portfolioSteps[stepIndex], "touched", false);
      });

      Vue.set(state, "returnToReviewAndSubmit", false);

      //clear out task order models
      Vue.set(state, "taskOrderModels", []);

      const es: number[] = state.erroredSteps;
      es.splice(0, es.length);
    },
    doSetCurrentPortfolioId(state, id) {
      state.currentPortfolioId = id;
    },
    setNavSideBarDisplayed(state, routeName: string) {
      if (routeName) {
        const routesWithNoNavSideBar = ["home", "dashboard", "profile"];
        state.isNavSideBarDisplayed = routesWithNoNavSideBar.every(
          (r) => r.toLowerCase() !== routeName.toLowerCase()
        );
      }
    },
    doToast(state, props) {
      state.toast = props;
    },
    doSetReturnToReviewAndSubmit(state, shouldReturn) {
      state.returnToReviewAndSubmit = shouldReturn;
    },
  },
  /*
  ██████████████████████████████████████████████████████

   █████   ██████ ████████ ██  ██████  ███    ██ ███████
  ██   ██ ██         ██    ██ ██    ██ ████   ██ ██
  ███████ ██         ██    ██ ██    ██ ██ ██  ██ ███████
  ██   ██ ██         ██    ██ ██    ██ ██  ██ ██      ██
  ██   ██  ██████    ██    ██  ██████  ██   ████ ███████

  ██████████████████████████████████████████████████████
  */
  actions: {
    login({ commit }, user) {
      commit("changeLoginStatus", true);
      commit("changeUser", user);
    },
    logout({ commit }) {
      commit("changeLoginStatus", false);
      commit("changeUser", null);
      window.sessionStorage.clear();
    },
    validateStep({ commit }, step: number) {
      commit("setStepValidated", step);
    },
    displayNavSideBarDisplayed({ commit }, routeName: string) {
      commit("setNavSideBarDisplayed", routeName);
    },
    authorizeUser({ commit }) {
      commit("changeisUserAuthorizedToProvisionCloudResources", true);
    },
    unauthorizeUser({ commit }) {
      commit("changeisUserAuthorizedToProvisionCloudResources", false);
    },
    setCurrentStepNumber({ getters, commit }, step: number) {
      commit("doSetCurrentStepNumber", step);
      const stepModel = getters.getStepModel(step);
      commit("doSetCurrentStepModel", stepModel);
    },
    setCurrentStepModel({ commit }, model) {
      commit("doSetCurrentStepModel", model);
    },
    async saveStepModel({ commit, getters }, [model, stepNumber, valid]) {
      const stepIndex: number = getters.getStepIndex(stepNumber);
      commit("doSaveStepModel", [model, stepNumber, stepIndex, valid]);
    },
    async updateStepModelValidity({ commit, getters }, [stepNumber, valid]) {
      const stepIndex: number = getters.getStepIndex(stepNumber);
      commit("doUpdateStepModelValidity", [stepNumber, stepIndex, valid]);
    },
    async setStepTouched({ commit, getters }, [stepNumber, isTouched]) {
      const stepIndex: number = getters.getStepIndex(stepNumber);
      commit("doSetStepTouched",[stepIndex, isTouched]);
    },
    async deleteTaskOrder(
      { commit, state, getters, rootGetters },
      id: string
    ): Promise<void> {
      try {
        this.dispatch("taskOrders/deleteTaskOrder", id);
        const stepIndex: number = getters.getStepIndex(2);
        commit("doInitializeStepModel", [createStepTwoModel(), stepIndex]);

        const taskOrderModels = rootGetters[
          "taskOrders/taskOrders"
        ] as TaskOrderModel[];

        const taskOrders = {
          task_orders: mapTaskOrders(taskOrderModels),
        };

        await portfoliosApi.saveFunding(state.currentPortfolioId, taskOrders);
      } catch (error) {
        console.log(error);
      }
    },
    editTaskOrder({ commit, getters, rootGetters }, id: string) {
      const taskOrderModels = rootGetters[
        "taskOrders/taskOrders"
      ] as TaskOrderModel[];

      const taskOrderIndex = getEntityIndex(
        taskOrderModels,
        (taskOrder: TaskOrderModel) => taskOrder.id === id
      );

      if (taskOrderIndex === -1) {
        throw new Error("unable to location task order model with id :" + id);
      }
      const taskOrder = taskOrderModels[taskOrderIndex];
      const stepIndex: number = getters.getStepIndex(2);
      commit("doSaveStepModel", [taskOrder, 2, stepIndex, true]);
    },
    addNewTaskOrder({ commit, getters }) {
      const model = { ...createStepTwoModel() };
      const stepIndex: number = getters.getStepIndex(2);
      commit("doInitializeStepModel", [model, stepIndex]);
    },
    editApplication({ commit, getters, rootGetters }, id: string) {
      const applicationModels = rootGetters[
        "applications/applications"
      ] as ApplicationModel[];

      const entityIndex = getEntityIndex(
        applicationModels,
        (entity: ApplicationModel) => entity.id === id
      );

      if (entityIndex === -1) {
        throw new Error("unable to location task order model with id :" + id);
      }
      const applicationModel = applicationModels[entityIndex];
      const stepIndex: number = getters.getStepIndex(3);
      commit("doSaveStepModel", [applicationModel, 3, stepIndex, true]);
    },
    addNewApplication({ commit, getters }) {
      const model = { ...createStepThreeModel() };
      const stepIndex: number = getters.getStepIndex(3);
      commit("doInitializeStepModel", [model, stepIndex]);
    },
    /**
     *
     * saves step data to backend based on step number
     */
    async saveStepData({ state, getters }, stepNumber) {
      const stepIndex: number = getters.getStepIndex(stepNumber);
      const step = state.portfolioSteps[stepIndex];
      switch (stepNumber as number) {
        case 1:
          await this.dispatch("saveStep1", step.model);
          break;
        case 2:
          await this.dispatch("saveStep2", step.model);
          break;
        case 3:
          await this.dispatch("saveStep3", step.model);
          break;
        case 4:
          await this.dispatch("saveStep4", true);
          break;
      }
    },
    async saveStep1({ state }, model: any) {
      // build data from step model
      const data = {
        name: model.name,
        description: model.description,
        csp: model.csp,
        dod_components: model.dod_components,
        portfolio_managers: [],
      };

      await portfoliosApi.savePortfolio(state.currentPortfolioId, data);
    },
    async saveStep2({ state, rootGetters }, model: TaskOrderModel) {
      const taskOrderModels = rootGetters[
        "taskOrders/taskOrders"
      ] as TaskOrderModel[];

      const isNew = model.id === "";
      let modelIndex = -1;

      if (isNew) {
        model.id = generateUid();
        this.dispatch("taskOrders/addTaskOrder", model);
        modelIndex = taskOrderModels.length - 1;
      } else {
        const taskOrderIndex = getEntityIndex<TaskOrderModel>(
          taskOrderModels,
          (taskOrder) => taskOrder.id === model.id
        );

        if (taskOrderIndex === -1) {
          throw new Error(
            "unable to location task order model with id :" + model.id
          );
        }

        this.dispatch("taskOrders/updateTaskOrder", { taskOrderIndex, model });
      }

      const taskOrders = {
        task_orders: mapTaskOrders(taskOrderModels),
      };

      await portfoliosApi.saveFunding(state.currentPortfolioId, taskOrders);

      //set the model signed value to true after saving to server
      if (isNew) {
        model.signed = true;
        this.dispatch("taskOrders/updateTaskOrder", { modelIndex, model });
      }
    },
    async saveStep3({ state, rootGetters }, model: any) {
      const applicationModels = rootGetters[
        "applications/applications"
      ] as ApplicationModel[];

      const portfolioOperators = rootGetters[
        "applications/portfolioOperators"
      ] as OperatorModel[];

      const application = model as ApplicationModel;

      const validRootAdmins =
        portfolioOperators.length > 0
          ? portfolioOperators.every((operator) => validOperator(operator))
          : true;

      // a very basic validation test before attempting to update and save
      if (validateApplication(application) && validRootAdmins) {
        if (model.id === "") {
          model.id = generateUid();
          this.dispatch("applications/addApplication", model);
        } else {
          const appIndx = getEntityIndex<ApplicationModel>(
            applicationModels,
            (application) => application.id === model.id
          );
          if (appIndx === -1) {
            throw new Error(
              "unable to locate application model with id :" + model.id
            );
          }

          this.dispatch("applications/updateApplication", { appIndx, model });
        }
      }

      const applications = mapApplications(applicationModels);
      const operators = mapOperators(portfolioOperators);

      const data = {
        operators: operators,
        applications: applications,
      };

      await portfoliosApi.saveApplications(state.currentPortfolioId, data);


    },
    async saveStep4({ state, rootGetters, getters }, saveApps) {
      const applicationModels = rootGetters[
        "applications/applications"
      ] as ApplicationModel[];

      const portfolioOperators = rootGetters[
        "applications/portfolioOperators"
      ] as OperatorModel[];

      if (applicationModels.length) {

        const applications = mapApplications(applicationModels);
        const operators = mapOperators(portfolioOperators);

        const hasAppOrEnvOperators =
          rootGetters["applications/appOrEnvHasOperators"](applications);
        if (hasAppOrEnvOperators) {
          this.dispatch("applications/setPortfolioHasHadMembersAdded", true);
        }
        if (saveApps) {
          const data = {
            operators: operators,
            applications: applications,
          };
          await portfoliosApi.saveApplications(state.currentPortfolioId, data);
        }

        const [isStep4Valid, portfolioHasOperators] = validateHasAdminOperators(
          portfolioOperators,
          applicationModels
        );
        const portfolioHasHadMembersAdded =
          getters["applications/portfolioHasHadMembersAdded"];

        this.dispatch("setStepTouched", [4, portfolioHasHadMembersAdded]);
        this.dispatch("updateStepModelValidity", [4, isStep4Valid]);
        this.dispatch("updateMembersModified", false);
      }
    },
    updateMembersModified({ commit }, added: boolean): void {
      commit("doUpdateMembersModified", added);
    },
    /**
     * Saves all valid step models with changes
     * @param context
     * @returns boolean value indicating successful save
     */
    async saveAllValidSteps({ state }): Promise<boolean> {
      let saved = false;
      //trigger validation
      // await this.dispatch("triggerValidation");
      // an array of promises to hold each step save api call
      const saveActions: unknown[] = [];
      // iterate over portfolio steps model and push valid models to save actions
      state.portfolioSteps.forEach((step) => {
        // only save models that have changes and are valid
        if (step.touched && step.valid) {
          if (
            step.step === 2 &&
            !stepModelHasData(step.model, createStepTwoModel())
          )
            return;

          if (
            step.step === 3 &&
            !stepModelHasData(step.model, createStepThreeModel())
          )
            return;

          saveActions.push(this.dispatch("saveStepData", step.step));
        }
      });

      try {
        await Promise.all(saveActions);
        saved = true;
      } catch (error) {
        console.log(error);
      }
      return saved;
    },
    async createPortfolioDraft({ commit }): Promise<void> {
      //initialize steps models
      commit("doInitializeSteps");

      //initilize module states
      this.dispatch("applications/initialize");
      this.dispatch("taskOrders/initialize");

      const portfolioDraftId = await portfoliosApi.createDraft();
      commit("doSetCurrentPortfolioId", portfolioDraftId);
    },
    async loadPortfolioDraft({ commit }, draftId: string): Promise<void> {
      //initial step model data
      commit("doInitializeSteps");

      this.dispatch("applications/initialize");
      this.dispatch("applications/setPortfolioHasHadMembersAdded", false);

      //validate that portfolio draft id exists on the server
      const id = await portfoliosApi.getDraft(draftId);

      if (id === null) {
        throw new Error(`unable to locate portfolio draft with ${id}`);
      }

      commit("doSetCurrentPortfolioId", draftId);
      const loadActions = [
        this.dispatch("loadStep1Data", draftId),
        this.dispatch("loadStep2Data", draftId),
        this.dispatch("loadStep3Data", draftId),
      ];
      await Promise.all(loadActions);
      await this.dispatch("saveStep4", false);
    },
    async loadStep1Data({ commit, getters }, draftId: string): Promise<void> {
      const draft = await portfoliosApi.getPortfolio(draftId);
      if (draft) {
        const step1Model = {
          name: draft.name,
          description: draft.description,
          dod_components: draft.dod_components,
          csp: draft.csp,
        };

        // update step 1 model
        const stepIndex: number = getters.getStepIndex(1);
        commit("doSaveStepModel", [step1Model, 1, stepIndex, true]);
      }
    },
    async loadStep2Data({ commit, getters }, draftId: string): Promise<void> {
      // get funding details
      const taskOrders = await portfoliosApi.getFunding(draftId);

      if (taskOrders !== null) {
        //store the tasks orders
        this.dispatch("taskOrders/setCurrentTaskOrders", taskOrders);
        const stepIndex: number = getters.getStepIndex(2);
        commit("doSaveStepModel", [createStepTwoModel(), 2, stepIndex, true]);
      }
    },
    async loadStep3Data({ commit, getters }, draftId: string): Promise<void> {
      const applicationData = await portfoliosApi.getApplications(draftId);
      if (applicationData !== null) {
        //store the applications
        commit(
          "applications/setCurrentApplications",
          applicationData.applications
        );
        commit("applications/initializeRootAdministrators");

        const rootAdmins = applicationData.operators.map(
          (operator: Operator) => {
            const operatorModels: OperatorModel = {
              ...operator,
              id: generateUid(),
            };

            return operator;
          }
        );

        commit("applications/updateRootAdministrators", rootAdmins);
        const stepIndex: number = getters.getStepIndex(3);
        commit("doSaveStepModel", [createStepThreeModel(), 3, stepIndex, true]);
      }
    },
    openDialog(
      { commit },
      [dialogType, setFocusOnDialog, dialogWidth, dialogHeight, props]
    ) {
      const dialogProps: Dialog = {
        isDisplayed: true,
        type: dialogType,
        setFocus: setFocusOnDialog,
        width: dialogWidth,
        height: dialogHeight,
        props: props,
      };
      commit("changeDialog", dialogProps);
    },
    initDialog({ commit }) {
      const dialogProps: Dialog = {
        isDisplayed: false,
        type: "",
        setFocus: false,
        width: "",
        height: "",
        props: null,
      };
      commit("changeDialog", dialogProps);
    },
    closeSideDrawer({ commit }) {
      commit("doCloseSideDrawer");
    },
    openSideDrawer({ commit }, [drawerType, openerId]) {
      commit("doOpenSideDrawer", [drawerType, openerId]);
    },
    toast({ commit }, [message, contentClass]) {
      const toastProps: Toast = {
        isDisplayed: true,
        message: message,
        contentClass: contentClass,
      };
      commit("doToast", toastProps);
    },
    isStepTouched({ state }, stepNumber: number) {
      const index = StepModelIndices[stepNumber];
      return state.portfolioSteps[index].touched;
    },
    setReturnToReviewAndSubmit({ commit }, shouldReturn: boolean) {
      commit("doSetReturnToReviewAndSubmit", shouldReturn);
    },
  },
  /*
  ██████████████████████████████████████████████████████████

   ██████  ███████ ████████ ████████ ███████ ██████  ███████
  ██       ██         ██       ██    ██      ██   ██ ██
  ██   ███ █████      ██       ██    █████   ██████  ███████
  ██    ██ ██         ██       ██    ██      ██   ██      ██
   ██████  ███████    ██       ██    ███████ ██   ██ ███████

  ██████████████████████████████████████████████████████████
  */
  getters: {
    getInvalidSteps(state) {
      const invalidSteps: number[] = [];
      state.portfolioSteps.forEach((step) => {
        if (step.step < 5 && (step.touched === false || step.valid === false)) {
          invalidSteps.push(step.step);
        }
      });
      return invalidSteps;
    },
    getLoginStatus(state) {
      return state.loginStatus;
    },
    getIsNavSideBarDisplayed(state) {
      return state.isNavSideBarDisplayed;
    },
    getisUserAuthorizedToProvisionCloudResources(state) {
      return state.isUserAuthorizedToProvisionCloudResources;
    },
    getNavBarItems(state): Navs {
      return {
        logout: {
          id: "atat-nav__logout",
          title: "logout Nav",
          items: [],
        },
        login: {
          id: "atat-nav__login",
          title: "login Nav",
          items: [
            {
              id: 1,
              cssClass: "atat-header-nav__user-display-name",
              title: state.user.given_name + " " + state.user.family_name,
              newWindow: false,
              icon: "person",
              iconPlacement: "left",
              action: "profile",
              ariaLabel:
                "Open panel with user profile information for " +
                state.user.given_name +
                " " +
                state.user.family_name,
              ariaRole: "button",
            },
            {
              id: 2,
              cssClass: "atat-header-nav__support",
              title: "Support",
              url: "#",
              newWindow: false,
              icon: "help_outline",
              iconPlacement: "left",
              ariaLabel: "ATAT Support",
              ariaRole: "link",
            },
            {
              id: 3,
              cssClass: "atat-header-nav__logout",
              title: "Logout",
              url: "/",
              newWindow: false,
              icon: "logout",
              iconPlacement: "right",
              action: "logout",
              ariaLabel: "Log out of ATAT",
              ariaRole: "link",
            },
          ],
        },
      };
    },
    getMockTaskOrders() {
      return mockTaskOrders;
    },
    getStepModel: (state) => (stepNumber: number) => {
      const step = state.portfolioSteps.find(
        (o: { step: number }) => o.step === stepNumber
      );
      return step?.model;
    },
    getCurrentStepModel: (state) => state.currentStepModel,
    getStepTouched: (state, getters) => (stepNumber: number) => {
      const stepIndex: number = getters.getStepIndex(stepNumber);
      return state.portfolioSteps[stepIndex].touched;
    },
    getUser: (state) => state.user,
    getSideDrawerIsOpen: (state) => state.sideDrawerIsOpen,
    hasTaskOrders: (state, getters, rootState, rootGetters): boolean => {
      const taskOrderModels = rootGetters[
        "taskOrders/taskOrders"
      ] as TaskOrderModel[];

      return taskOrderModels && taskOrderModels.length > 0;
    },
    getTaskOrders: (state, rootGetters) => rootGetters["taskOrders/taskOrders"],
    getPortfolio: (state) => state.portfolioSteps[StepModelIndices[1]].model,
    getPortfolioName: (state, getters) => (defaultResponse: string) => {
      defaultResponse = defaultResponse || "this portfolio";
      let pName = defaultResponse;
      const portfolio = getters.getPortfolio;
      if (portfolio) {
        if (Object.prototype.hasOwnProperty.call(portfolio, "name")) {
          pName = portfolio.name || pName;
        }
        if (
          pName === defaultResponse &&
          Object.prototype.hasOwnProperty.call(portfolio, "model")
        ) {
          if (Object.prototype.hasOwnProperty.call(portfolio, "name")) {
            pName = portfolio.model.name || pName;
          }
        }
      }
      return pName;
    },
    hasApplications: (state, getters, rootState, rootGetters): boolean => {
      const applicationModels = rootGetters[
        "applications/applications"
      ] as ApplicationModel[];

      return applicationModels && applicationModels.length > 0;
    },
    membersModified: (state) => {
      return state.membersModified;
    },
    getStepIndex: (state) => (stepNumber: number): number => {
      const stepIndex = state.portfolioSteps.findIndex(
        (x) => x.step === stepNumber
      );
      return stepIndex;
    },
    isStepErrored: (state) => (stepNumber: number): boolean => {
      const es: number[] = state.erroredSteps;
      const i = es.indexOf(stepNumber);
      return i > -1;
    },
    isStepTouched: (state, getters) => (stepNumber: number): boolean => {
      const stepIndex: number = getters.getStepIndex(stepNumber);
      return state.portfolioSteps[stepIndex].touched;
    },
    isReturnToReviewAndSubmit: (state) => {
      return state.returnToReviewAndSubmit;
    },
  },
  modules: {
    portfolios,
    applications,
    taskOrders,
  },
});
