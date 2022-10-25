import Vue from "vue";
import Vuetify from "vuetify";
import {createLocalVue, mount, Wrapper} from "@vue/test-utils";
import {DefaultProps} from "vue/types/options";
import ProposalRequiredBVTO
  from "@/steps/02-EvaluationCriteria/EvalPlan/ProposalRequiredBVTO.vue";
Vue.use(Vuetify);

describe("Testing ProposalRequiredBVTO Component", () => {
  const localVue = createLocalVue();
  let vuetify: Vuetify;
  let wrapper: Wrapper<DefaultProps & Vue, Element>;

  beforeEach(() => {
    vuetify = new Vuetify();
    wrapper = mount(ProposalRequiredBVTO, {
      vuetify,
      localVue
    });
  });

  describe("testing ProposalRequiredBVTO render", () => {
    it("renders successfully", async () => {
      expect(wrapper.exists()).toBe(true);
    });
  })
})
