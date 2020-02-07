import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import Log from "../Util";
import CheckValid from "./CheckValid";

export default class QueryBranch {
    public ckvalid: CheckValid;

    constructor() {
        this.ckvalid = new CheckValid();
        Log.trace("InsightFacadeImpl::init()");
    }

    public performQuery(query: any, datasets: any, id: string): Promise<any[]> {
        try {
            let section = datasets.get(id);
            if (this.ckvalid.CheckValid(query, id)) {
                let result1: any[];
                if (Object.keys(query.WHERE).length === 0) {
                    result1 = section;
                } else {
                    result1 = this.filterResult(query.WHERE, section);
                }
                let result2 = this.orderedResult(query.OPTIONS, result1);
                return Promise.resolve(result2);
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public static getstring(query: any): string {
        if (query === null || query.WHERE == null || query.OPTIONS == null) {
            throw new InsightError("Invalid query! One of WHERE and OPTIONS or both are null");
        }
        if (query.OPTIONS.COLUMNS == null || query.OPTIONS.COLUMNS.length === 0) {
            throw new InsightError("Can't find a valid id in Invalid Query!");
        }
        if (typeof query.OPTIONS.COLUMNS[0] !== "string") {
            throw new InsightError("Invalid query! At least one item in Column is not string");
        }
        if (!query.OPTIONS.COLUMNS[0].includes("_")) {
            throw new InsightError("Invalid query! There are no _ to show id and other keys");
        }
        let id: string = query.OPTIONS.COLUMNS[0].split("_")[0];
        if (id.includes("_")) {
            throw new InsightError("Invalid query! There are more than one _ in column items");
        }
        if (id === "") {
            throw new InsightError("Invalid id!");
        }
        return id;
    }

    // list all cases: AND,OR,EQ,LT....
    private filterResult(Where: any, sections: any[]): any[] {
        if (Where.AND || Where.OR) {
            return this.LogicResult(Where, sections);
        }
        if (Where.LT || Where.EQ || Where.GT) {
            return this.MCResult(Where, sections);
        }
        if (Where.NOT) {
            if (Object.keys(Where.NOT).length === 1) {
                let notresult = this.filterResult(Where.NOT, sections);
                return sections.filter(function (section) {
                    return !notresult.includes(section);
                });
            } else {
                throw new InsightError("Invalid filter in NOT!");
            }
        }
        if (Where.IS) {
            return this.ISResult(Where.IS, sections);
        }
    }

    // logic result
    private LogicResult(LCquery: any, sections: any[]): any[] {
        if (LCquery.OR) {
            let ORresult: any[] = [];
            let ORMap = new Map();
            for (let orquery of LCquery.OR) {
                for (let orq of this.filterResult(orquery, sections)) {
                    if (!ORMap.has(orq["courses_uuid"])) {
                        ORMap.set(orq["courses_uuid"], orq);
                        ORresult.push(orq);
                    }
                }
            }
            return ORresult;
        }
        if (LCquery.AND) {
            let andresult: any = {};
            let uuidlist: any[] = [];
            if (LCquery.AND.length === 1) {
                return this.filterResult(LCquery.AND[0], sections);
            }
            for (let item0 of this.filterResult(LCquery.AND[0], sections)) {
                uuidlist.push(item0["courses_uuid"]);
            }
            for (let i = 1; i < LCquery.AND.length; i++) {
                andresult = {};
                for (let item of this.filterResult(LCquery.AND[i], sections)) {
                    if (!uuidlist.includes(item["courses_uuid"])) {
                        uuidlist.push(item["courses_uuid"]);
                    } else {
                        andresult[item["courses_uuid"]] = item;
                    }
                }
                uuidlist = Object.keys(andresult);
            }
            return Object.values(andresult);
        }

    }

    private MCResult(MCquery: any, sections: any[]): any[] {
        if (MCquery.LT) {
            let mkey = Object.keys(MCquery.LT)[0];
            let val = MCquery.LT[mkey];
            return sections.filter((ele) => {
                return ele[mkey] < val;
            });
        }
        if (MCquery.EQ) {
            let mkey = Object.keys(MCquery.EQ)[0];
            let val = MCquery.EQ[mkey];
            return sections.filter((ele) => {
                return ele[mkey] === val;
            });
        }
        if (MCquery.GT) {
            let mkey = Object.keys(MCquery.GT)[0];
            let val = MCquery.GT[mkey];
            return sections.filter((ele) => {
                return ele[mkey] > val;
            });
        }
    }

    private ISResult(ISquery: any, sections: any): any[] {
        let wild: string = "*";
        let skey: string = Object.keys(ISquery)[0];
        let value: string = ISquery[skey];
        let valuelen = value.length;
        if (value.includes(wild)) {
            if (value === "*" || value === "**") {
                return sections;
            }
            return sections.filter((section: any) => {
                let sectionValue = section[skey];
                if (value.startsWith(wild) && value.endsWith(wild)) {
                    return sectionValue.includes(value.substring(1, valuelen - 1));
                }
                if (value.startsWith(wild)) {
                    return sectionValue.endsWith(value.substring(1, valuelen));
                }
                if (value.endsWith(wild)) {
                    return sectionValue.startsWith(value.substring(0, valuelen - 1));
                }
            });
        } else {
            return sections.filter((section: any) => {
                return section[skey] === value;
            });
        }
    }
// sort the result by column and order
    private orderedResult(OPTIONquery: any, sections: any[]): any[] {
        let Column: string[] = OPTIONquery.COLUMNS;
        let Order: string = OPTIONquery.ORDER;
        let ColumnResult: any[] = [];
        if (sections.length > 5000) {
            throw new ResultTooLargeError("The result is too large");
        }
        for (let section of sections) {
            let res: any = {};
            for (let co of Column) {
                res[co] = section[co];
            }
            ColumnResult.push(res);
        }
        if (Order == null) {
            return ColumnResult;
        } else {
            return ColumnResult.sort((sec1, sec2) => {
                if (sec1[Order] > sec2[Order]) {
                    return 1;
                }

                if (sec1[Order] < sec2[Order]) {
                    return -1;
                }
                return 0;
            });
        }
    }
}
