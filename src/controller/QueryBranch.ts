import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import CheckValid from "./CheckValid";
import Transformation from "./Transformation";
export default class QueryBranch {
    public performQuery(query: any, section: any[], id: string): Promise<any[]> {
        try {
            let ckvalid = new CheckValid();
            if (ckvalid.CheckValid(query, id)) {
                let result1 = this.filterList(id, query, section);
                if (query.TRANSFORMATIONS) {
                    let result2 = this.transformList(query.TRANSFORMATIONS, result1);
                    return Promise.resolve(this.orderedResult(query.OPTIONS, result2));
                }
                return Promise.resolve(this.orderedResult(query.OPTIONS, result1));
            } else {
                return Promise.reject("Invalid query!");
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }

    private filterList(id: string, query: any, section: any[]): any[] {
        if (Object.keys(query.WHERE).length === 0) {
            return section;
        } else if (Object.keys(query.WHERE).length > 0) {
            return this.filterResult(id, query.WHERE, section);
        }
    }

    private transformList(query: any, section: any[]): any[] {
        let transform = new Transformation();
        return transform.transResult(query, section);
    }

    public static getstring(query: any): string {
        if (query === null || query.WHERE == null || query.OPTIONS == null) {
            throw new InsightError("Invalid query! One of WHERE and OPTIONS or both are null");
        }
        if (query.OPTIONS.COLUMNS == null || query.OPTIONS.COLUMNS.length === 0) {
            throw new InsightError("Can't find a valid id in Invalid Query!");
        }
        let column = query.OPTIONS.COLUMNS;
        for (let col of column) {
            if (typeof col === "string") {
                if (col.includes("_") && col.split("_").length !== 2) {
                    throw new InsightError("Invalid query! There are not keys in columns");
                }
                return col.split("_")[0];
            } else {
                throw new InsightError("Invalid query! Column is Not a string");
            }
        }
        if (!query.TRANSFORMATIONS || !query.TRANSFORMATIONS.GROUP) {
            throw new InsightError("Invalid query! Cant find the id in apply");
        } else {
            let group = query.TRANSFORMATIONS.GROUP;
            if (group === null || Object.keys(group).length < 1) {
                throw new InsightError("Invalid query! Cant find the id in invalid apply");
            } else {
                let key = group[0];
                if (typeof key === "string" && key.includes("_") && key.split("_").length === 2) {
                    return key.split("_")[0];
                } else {
                    throw new InsightError("Invalid query! There are not keys in columns");
                }
            }
        }
    }

    private filterResult(id: string, Where: any, sections: any[]): any[] {
        if (Where.AND || Where.OR) {
            return this.LogicResult(id, Where, sections);
        } else if (Where.LT || Where.EQ || Where.GT) {
            return this.MCResult(Where, sections);
        } else if (Where.NOT) {
            if (Object.keys(Where.NOT).length === 1) {
                let notresult = this.filterResult(id, Where.NOT, sections);
                return sections.filter(function (section) {
                    return !notresult.includes(section);
                });
            } else {
                throw new InsightError("Invalid filter in NOT!");
            }
        } else if (Where.IS) {
            return this.ISResult(Where.IS, sections);
        }
    }

    private LogicResult(id: string, LCquery: any, sections: any[]): any[] {
        let identity: string;
        if (id === "courses") {
            identity = "courses_uuid";
        }
        if (id === "rooms") {
            identity = "rooms_name";
        }
        if (LCquery.OR) {
            let ORresult: any[] = [];
            let ORMap = new Map();
            for (let orquery of LCquery.OR) {
                for (let orq of this.filterResult(id, orquery, sections)) {
                    if (!ORMap.has(orq[identity])) {
                        ORMap.set(orq[identity], orq);
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
                return this.filterResult(id, LCquery.AND[0], sections);
            }
            for (let item0 of this.filterResult(id, LCquery.AND[0], sections)) {
                uuidlist.push(item0[identity]);
            }
            for (let i = 1; i < LCquery.AND.length; i++) {
                andresult = {};
                for (let item of this.filterResult(id, LCquery.AND[i], sections)) {
                    if (!uuidlist.includes(item[identity])) {
                        uuidlist.push(item[identity]);
                    } else {
                        andresult[item[identity]] = item;
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
        } else if (MCquery.EQ) {
            let mkey = Object.keys(MCquery.EQ)[0];
            let val = MCquery.EQ[mkey];
            return sections.filter((ele) => {
                return ele[mkey] === val;
            });
        } else if (MCquery.GT) {
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
                } else if (value.startsWith(wild)) {
                    return sectionValue.endsWith(value.substring(1, valuelen));
                } else if (value.endsWith(wild)) {
                    return sectionValue.startsWith(value.substring(0, valuelen - 1));
                }
            });
        } else {
            return sections.filter((section: any) => {
                return section[skey] === value;
            });
        }
    }

    private orderedResult(OPTIONquery: any, sections: any[]): any[] {
        let Column: string[] = OPTIONquery.COLUMNS;
        let ColumnResult: any[] = [];
        if (sections.length > 5000) {
            throw new ResultTooLargeError(" The reult is too large");
        }
        for (let section of sections) {
            let res: any = {};
            for (let co of Column) {
                res[co] = section[co];
            }
            ColumnResult.push(res);
        }
        if (OPTIONquery.ORDER == null) {
            return ColumnResult;
        } else {
            let Sort: any = OPTIONquery.ORDER;
            if (typeof Sort === "string") {
                return this.sortfoo("UP", Sort, ColumnResult);
            } else {
                return this.SortResult(Sort["dir"], Sort["keys"], ColumnResult);
            }
        }
    }

    private SortResult(order: string, keys: string[], sections: any[]): any[] {
        if (keys.length === 1) {
            return this.sortfoo(order, keys[0], sections);
        }
        let sorted: string[] = [];
        return this.sortHelper(order, sorted, keys, sections);
    }

    private sortHelper(order: string, sorted: string[], keys: string[], unsort: any[]): any[] {
        if (keys.length === 0) {
            return unsort;
        }
        let key1s = keys.slice(1);
        if (sorted.length === 0) {
            let initsort = this.sortfoo(order, keys[0], unsort);
            sorted.push(keys[0]);
            return this.sortHelper(order, sorted, key1s, initsort);
        }
        let recsort = this.Sortrec(order, sorted, keys[0], unsort);
        sorted.push(keys[0]);
        return this.sortHelper(order, sorted, key1s, recsort);
    }

    private sortfoo(order: string, key: string, sections: any[]): any[] {
        if (order === "DOWN") {
            return sections.sort((sec1, sec2) => {
                if (sec2[key] > sec1[key]) {
                    return 1;
                } else if (sec2[key] < sec1[key]) {
                    return -1;
                }
                return 0;
            });
        }
        if (order === "UP") {
            return sections.sort((sec1, sec2) => {
                if (sec2[key] > sec1[key]) {
                    return -1;
                } else if (sec2[key] < sec1[key]) {
                    return 1;
                }
                return 0;
            });
        }

    }

    private Sortrec(order: string, sorteds: string[], unsort: string, sections: any[]): any[] {
        if (order === "DOWN") {
            return sections.sort((sec1, sec2) => {
                for (let sorted of sorteds) {
                    if (sec2[sorted] > sec1[sorted]) {
                        return 1;
                    } else if (sec2[sorted] < sec1[sorted]) {
                        return -1;
                    }
                }
                if (sec2[unsort] > sec1[unsort]) {
                    return 1;
                } else if (sec2[unsort] < sec1[unsort]) {
                    return -1;
                } else {
                    return 0;
                }
            });
        }
        if (order === "UP") {
            return sections.sort((sec1, sec2) => {
                for (let sorted of sorteds) {
                    if (sec2[sorted] > sec1[sorted]) {
                        return -1;
                    } else if (sec2[sorted] < sec1[sorted]) {
                        return 1;
                    }
                }
                if (sec2[unsort] > sec1[unsort]) {
                    return -1;
                } else if (sec2[unsort] < sec1[unsort]) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }
    }
}
