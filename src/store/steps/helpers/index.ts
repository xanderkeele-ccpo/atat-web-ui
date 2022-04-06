import { StepperRouteConfig } from "types/Global";
import { StepInfo, StepRouteResolver } from "../types";

export const mapStepConfigs = (
  config: StepperRouteConfig[]
): Map<string, StepInfo> => {
  
  const map = new Map<string, StepInfo>();
  let last = "";
  const mapStep = (routeConfig: StepperRouteConfig, config?: StepperRouteConfig[]) => {
    const stepInfo: StepInfo = {
      stepNumber: routeConfig.stepNumber || "",
      stepName: routeConfig.name || "",
      stepLabel: routeConfig.menuText || "",
      prev: undefined,
      next: undefined,
      resolver: routeConfig.routeResolver,
      additionalButtons: routeConfig.additionalButtons || [],
      backButtonText: routeConfig.backButtonText || "Back",
    };
   
    const lastStep = map?.get(last || "");

    if (lastStep) {
      lastStep.next = stepInfo.stepName;
      stepInfo.prev = lastStep.stepName;
    }

    map?.set(stepInfo.stepName, stepInfo);
    last = stepInfo.stepName;

    routeConfig.children?.forEach((childConfig) =>
      {
        // debugger;
        mapStep({
          ...childConfig,
          stepNumber: stepInfo.stepNumber,
        })
      }
    );
  };
  // config.forEach((routeConfig, index) => 
  // {
  //   let lastStepName = "";
  //   if(index>0){
  //     let lastStep: StepperRouteConfig = config[index-1];
  //     const lastStepHasChildren = lastStep.children && lastStep.children?.length>0 ;
  //     lastStep = lastStepHasChildren ? lastStep.children?.slice(-1) : lastStep;
  //   }
  config.forEach((routeConfig) => mapStep(routeConfig));

    console.log(map);
  return map;
};

export const resolveNextRouteName = (current: string, stepInfo: StepInfo): string | undefined => {
  if (stepInfo.resolver) {
    return (stepInfo.resolver(current));
  }

  return stepInfo.stepName;
}

export const resolvePreviousRouteName = (current: string, stepInfo: StepInfo): string | undefined => {
  if (!stepInfo.prev)
    return stepInfo.prev;

  const prev = (typeof stepInfo.prev === 'string')
    ? stepInfo.prev
    : (stepInfo.prev as StepRouteResolver)(current);

  return prev;
}
