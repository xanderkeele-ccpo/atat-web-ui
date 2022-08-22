import Vue, { computed } from "vue";
import Vuex from "vuex";
import Vuetify from "vuetify";
import { createLocalVue, mount, Wrapper, config } from "@vue/test-utils";
import ComputeForm from "../DOW/ComputeForm.vue";
import { DefaultProps } from "vue/types/options";
import validators from "../../../plugins/validation";

import {
  Checkbox,
  RadioButton,
  SelectData,
} from "../../../../types/Global";
import DescriptionOfWork from "@/store/descriptionOfWork";
Vue.use(Vuetify);

describe("Testing ComputeForm Component", () => {
  const localVue = createLocalVue();
  localVue.use(validators);
  localVue.use(Vuex);
  let vuetify: Vuetify;
  let wrapper: Wrapper<DefaultProps & Vue, Element>;
  config.showDeprecationWarnings = false
  Vue.config.silent = true;

  //propsData
  const computeData = {
    "instanceNumber": 1,
    "environmentType": "Dev/Testing",
    // `pragma: allowlist secret`
    "classificationLevel": "class1",
    "deployedRegions": [
      "CONUS East"
    ],
    "deployedRegionsOther": "",
    "needOrUsageDescription": "sfsfsdfsad",
    "entireDuration": "",
    "periodsNeeded": [
      "1",
      "2"
    ],
    "operatingSystemAndLicensing": "safsfsdaf",
    "numberOfVCPUs": "1",
    "memory": "1",
    "storageType": "Provisioned IOPS SSD",
    "storageAmount": "1",
    "performanceTier": "Premium",
    "performanceTierOther": "",
    "numberOfInstancesNeeded": "1"
  }

  const avlClassificationLevelObjects = [
    {
      "sys_id": "1",
      "sys_mod_count": "0",
      "impact_level": "IL6",
      "classification": "S",
    },
    {
      "sys_id": "cc3b52af87970590ec3b777acebb3581",
      "sys_mod_count": "0",
      "impact_level": "IL2",
      "classification": "U",
    }
  ]

  const allClassificationLevels = [

    {
      "sys_id": "class1",
      "sys_mod_count": "0",
      "impact_level": "IL4",
      "classification": "U",
    },
    {
      "sys_id": "class2",
      "sys_mod_count": "0",
      "impact_level": "",
      "classification": "TS",
    },
    {
      "sys_id": "class3",
      "sys_mod_count": "0",
      "impact_level": "IL6",
      "classification": "S",
    },
    {
      "sys_id": "class4",
      "sys_mod_count": "0",
      "impact_level": "IL2",
      "classification": "U",
    },
    {
      "sys_id": "class5",
      "sys_mod_count": "0",
      "impact_level": "IL5",
      "classification": "U",
    }
  ]

  const availablePeriodCheckboxItems = [
    {
      "id": "BASE",
      "label": "Base period",
      "value": "base_01"
    },
    {
      "id": "OPTION1",
      "label": "Option period 1",
      "value": "option_01"
    }
  ]

  const regionCheckboxOptions = [
    {
      id: "CONUSEast",
      label: "CONUS East",
      value: "CONUS East",
    },
    {
      id: "CONUSCentral",
      label: "CONUS Central",
      value: "CONUS Central",
    },
    {
      id: "CONUSWest",
      label: "CONUS West",
      value: "CONUS West",
    },
    {
      id: "OCONUS",
      label: "OCONUS",
      value: "OCONUS",
    },
    {
      id: "Other",
      label: "Other",
      value: "OtherRegion",
    }];

  const periodDTO = [
    [
      {
        "period_unit": "YEAR",
        "period_unit_count": "1",
        "period_type": "BASE",
        "option_order": "1"
      },
      {
        "period_unit": "YEAR",
        "period_unit_count": "1",
        "period_type": "BASE",
        "option_order": "2"
      },
      {
        "period_unit": "YEAR",
        "period_unit_count": "1",
        "period_type": "BASE",
        "option_order": "3"
      }
    ]
  ];

  const classificationRadioOptions: RadioButton[] = [
    { id: "Option1", label: "label1", value: "IL1" },
    { id: "Option2", label: "label2", value: "IL2" },
  ]

  beforeEach(() => {
    vuetify = new Vuetify();
    wrapper = mount(ComputeForm, {
      localVue,
      vuetify,
      mocks: {
        $store: {
          DescriptionOfWork: {
            computeObject: computeData,
          }
        },

      },
      propsData: {
        computeData: computeData,
        avlClassificationLevelObjects: avlClassificationLevelObjects,
        firstTimeHere: true,
        isClassificationDataMissing: false,
        isPeriodsDataMissing: false,
        singleClassificationLevelName: "",
        otherRegionValue: "",
        otherPerformanceTierValue: "",
        formHasErrors: false,
        formHasBeenTouched: true,
        classificationRadioOptions: classificationRadioOptions, 
        classificationTooltipText: "",
        availablePeriodCheckboxItems: availablePeriodCheckboxItems,
        validateOtherTierNow: true,
        validateOtherTierOnBlur: true,
        clearOtherTierValidation: true,

      }
    });
  });


  describe("Initialization....", () => {
    it("tests that component renders successfully", async () => {
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Method Testing...", () => {
    it(`tests that 'openModal' is emitted when user clicks to update 
      classification requirements`, async () => {
      await wrapper.vm.openModal();
      expect(wrapper.emitted().openModal).toBeTruthy();
    });
  });

  describe("testing form fields", () => {
    describe("testing `entire duration` radio button selection", () => {
      it("tests `YES` being selected then clears prop.computeData.periodsNeeded[]", async () => {
        computeData.entireDuration = 'YES';
        await wrapper.setData({
          _computeData: computeData,
          availablePeriodCheckboxItems: [
            {
              id: "BaseDisabled",
              label: "Base period",
              value: "Base",
            }
          ]
        })
        Vue.nextTick(() => {
          expect(wrapper.vm.$props.computeData.periodsNeeded).toBe([]);
        })

      });

      it("tests `NO` being selected then sets prop.computeData.periodsNeeded[] to ['Base']",
        async () => {
          computeData.entireDuration = 'NO';
          await wrapper.setData({
            _computeData: computeData,
            availablePeriodCheckboxItems: [
              {
                id: "BaseDisabled",
                label: "Base period",
                value: "Base",
              }
            ]
          })
          Vue.nextTick(() => {
            expect(wrapper.vm.$props.computeData.periodsNeeded[0]).toBe(['Base']);
          })
        });
    });

  });

});
