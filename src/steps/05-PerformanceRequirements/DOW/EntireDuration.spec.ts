import Vue, { computed } from "vue";
import Vuex from "vuex";
import Vuetify from "vuetify";
import { createLocalVue, mount, Wrapper, config } from "@vue/test-utils";
import validators from "../../../plugins/validation";
import { DefaultProps } from "vue/types/options";

import EntireDuration from "./EntireDuration.vue";

Vue.use(Vuetify);

describe("Testing ComputeForm Component", () => {
  const localVue = createLocalVue();
  localVue.use(validators);
  localVue.use(Vuex);
  let vuetify: Vuetify;
  let wrapper: Wrapper<DefaultProps & Vue, Element>;
  config.showDeprecationWarnings = false
  Vue.config.silent = true;

  beforeEach(() => {
    vuetify = new Vuetify();
    wrapper = mount(EntireDuration, {
      localVue,
      vuetify,
      mocks: {
        // $store: {
        //   DescriptionOfWork: {
        //     computeObject: computeData,
        //   }
        // },

      },
      propsData: {
        // computeData: computeData
      }
    });
  });

  describe("Initialization....", () => {
    it("tests that component renders successfully", async () => {
      expect(wrapper.exists()).toBe(true);
    });
  });


});