import * as common from "../common/util/index"; //common utilities  
export { common };
var log = common.Logger("wutil");
export function alert(s) {
    log("Alerting web page!");
    window.alert(s);
}
//# sourceMappingURL=util.js.map