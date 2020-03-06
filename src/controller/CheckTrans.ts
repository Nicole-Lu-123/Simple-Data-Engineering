import {InsightError} from "./IInsightFacade";
import CheckOptions from "./CheckOptions";
import CheckValid from "./CheckValid";


export default class CheckTrans {
    public checkoptions: CheckOptions;

    constructor() {
        this.checkoptions = new CheckOptions();
    }

    public CheckTrans(query: any, id: string): boolean {
        let trans = query.TRANSFORMATIONS;
        if (Object.keys(trans).length === 2) {
            if (trans.GROUP && trans.APPLY && Object.keys(trans)[0] === "GROUP") {
                if (this.checkGroup(query, id) && this.checkApply(query, id)) {
                return (this.checkColumnkeys(query));
            } else {
                throw new InsightError("Invalid! Not all elements in Transforamtion are valid");
            }
        } else {
            throw new InsightError("Invalid formation of Transformation!");
        }
    } else {
            throw new InsightError("Invalid length of Transformation!");
        }
    }

    private checkColumnkeys(query: any): boolean {
        let column = query.OPTIONS.COLUMNS;
        let group = query.TRANSFORMATIONS.GROUP;
        let apply = query.TRANSFORMATIONS.APPLY;
        if ( column.length <= group.length + apply.length) {
            let applykey = [];
            for (let applyele of apply) {
                applykey.push(Object.keys(applyele)[0]);
            }
            for (let col of column) {
                if (!group.includes(col) && !applykey.includes(col)) {
                    throw new InsightError("Invalid! Not all elements in Transforamtion are valid");
                }
            }
            return true;
        } else {
            throw new InsightError("Invalid! Not all column in either group or apply or vice versa");
        }
    }

    private checkGroup(query: any, id: string): boolean {
        let groups = query.TRANSFORMATIONS.GROUP;
        let column = query.OPTIONS.COLUMNS;
        if (groups.length < 1) {
            throw new InsightError("Invalid group with no element in");
        }
        for (let group of groups) {
            if (typeof group !== "string") {
                throw new InsightError("Invalid type of key in group");
            }
            if (!this.checkoptions.checkKey(group, id)) {
                throw new InsightError("Invalid keys in gr oup");
            }
        }
        return true;
    }

    private checkApply(query: any, id: string): boolean {
        let applys: any[] = query.TRANSFORMATIONS.APPLY;
        if (applys.length < 1) {
            throw new InsightError(" Invalid APPLY list");
        } else {
            for (let applyrule of applys) {
                if (typeof applyrule !== "object") {
                    throw new InsightError("Invalid APPLY list");
                }
                if (Object.keys(applyrule).length !== 1) {
                    throw new InsightError("Invalid Applyrule");
                }
                let applykey = Object.keys(applyrule)[0];
                let applyobj = applyrule[applykey];
                if (!this.checkApplyKey(applykey, query) || !this.checkApplyToken(applyobj, id)) {
                    throw new InsightError("Invalid Applyrule formation");
                }
            }
            return true;
        }
    }

    private checkApplyKey(applykey: any, query: any): boolean {
        if (typeof applykey !== "string" || !this.checkoptions.checkApplykey(applykey)) {
            throw new InsightError("Invalid Apply key");
        } else {
            return true;
        }
    }

    private checkApplyToken(obj: any, id: string) {
        let applytokens = Object.keys(obj);
        if (applytokens.length !== 1) {
            throw new InsightError("Invalid applytoken");
        }
        let applytoken = applytokens[0];
        if (typeof applytoken === "string") {
            return this.checkApplyTokenMatch(applytoken, obj[applytoken], id);
        } else {
            throw new InsightError("Invalid applytoken type");
        }
    }

    private checkApplyTokenMatch(token: string, key: any, id: string): boolean {
        let ApplyToken: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
        let checkValid = new  CheckValid();
        let mfield = checkValid.givekeys("mkey", id);
        if (typeof key !== "string") {
            throw new InsightError("Invalid type of key");
        }
        if (! this.checkoptions.checkKey(key, id)) {
            throw new InsightError("Invalid key after applytoken");
        }
        if (ApplyToken.includes(token)) {
            if (token === "COUNT") {
                    return true;
            } else {
                let key1 = key.split("_")[1];
                if (mfield.includes(key1)) {
                    return true;
                } else {
                    throw new InsightError("Invalid typematching in applyrule");
                }

            }
        } else {
            throw new InsightError("Invalid token");
        }
    }
}
