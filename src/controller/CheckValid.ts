import {InsightError} from "./IInsightFacade";

export default class CheckValid {
    public CheckValid(query: any, id: string): boolean {
        return (this.checkValidBody(query.WHERE, id) && this.checkValidOption(query.OPTIONS, id));
    }

    // check valid body
    private checkValidBody(query: any, id: string): boolean {
        if (Object.keys(query).length === 1 || Object.keys(query).length === 0) {
            if (query.AND || query.OR || query.NOT || query.GT || query.EQ || query.LT || query.IS) {
                return this.checkValidFilter(query, id);
            } else {
                return true;
            }
        } else {
            throw new InsightError("Invalid filter in Where!");
        }
    }

    // check all filter: logiccomp,mcomp,scomp,negation and the keys:mkey,skey
    private checkValidFilter(query: any, id: string): boolean {
        if (Object.keys(query).length === 0) {
            throw new InsightError("Invalid! At least one filter is null.");
        }
        if (query.AND) {
            return this.LCcheckEach(query.AND, id);
        }
        if (query.OR) {
            return this.LCcheckEach(query.OR, id);
        }
        if (query.GT || query.EQ || query.LT) {
            return this.MCcheck(query, id);
        }
        if (query.IS) {
            return this.SCcheck(query, id) && this.IPstringcheck(query.IS);
        }
        if (query.NOT) {
            return this.checkValidFilter(query.NOT, id);
        } else {
            throw new InsightError("Invalid query, filter in AND/OR/NOT is in wrong type");
        }
    }
    private IPstringcheck(ISquery: any): boolean {
        let wild: string = "*";
        let skey: string = Object.keys(ISquery)[0];
        if (typeof ISquery[skey] === "string") {
            let value: string = ISquery[skey];
            let valuelen = value.length;
            if (value.includes(wild)) {
                if (value.startsWith(wild) && value.endsWith(wild)) {
                    let realvalue = value.substring(1, valuelen - 1);
                    if (realvalue.includes(wild)) {
                        throw new InsightError("Invalid query for using wildcard in a wrong way!");
                    } else {
                        return true;
                    }
                }
                if (value.startsWith(wild)) {
                    let realvalue = value.substring(1, valuelen);
                    if (realvalue.includes(wild)) {
                        throw new InsightError("Invalid query for using wildcard in a wrong way!");
                    } else {
                        return true;
                    }
                }
                if (value.endsWith(wild)) {
                    let realvalue = value.substring(0, valuelen - 1);
                    if (realvalue.includes(wild)) {
                        throw new InsightError("Invalid query for using wildcard in a wrong way!");
                    } else {
                        return true;
                    }
                }
            } else {
                return true;
            }
        } else {
            throw new InsightError("Invalid query! The input string is not a string!");
        }

    }
    private LCcheckEach(LClist: any[], id: string): boolean {
        if (LClist.length >= 2) {
            for (let LC of LClist) {
                if (!this.checkValidFilter(LC, id)) {
                    return false;
                }
            }
            return true;
        } else {
            throw new InsightError("Invalid! illegal Logic Compare!");
        }
    }

    private MCcheck(query: any, id: string): boolean {
        if (query.LT) {
            if (Object.keys(query.LT).length === 1) {
                if (typeof Object.keys(query.LT)[0] !== "string") {
                    throw new InsightError("Invalid query! The mkey is not a string!");
                }
                let mkey: string = Object.keys(query.LT)[0];
                let val = query.LT[mkey];
                if (typeof val !== "number") {
                    throw new InsightError("Invalid query! The value of mkey is not a number!");
                } else {
                    return this.mKeycheck(mkey, id);
                }
            } else {
                throw new InsightError("Invalid MC! The filter in LT is wrong");
            }
        }
        if (query.GT) {
            if (Object.keys(query.GT).length === 1) {
                if (typeof Object.keys(query.GT)[0] !== "string") {
                    throw new InsightError("Invalid query! The mkey is not a string!");
                }
                let mkey: string = Object.keys(query.GT)[0];
                let val = query.GT[mkey];
                if (typeof val !== "number") {
                    throw new InsightError("Invalid query! The value of mkey is not a number!");
                } else {
                    return this.mKeycheck(mkey, id);
                }
            } else {
                throw new InsightError("Invalid MC! The filter in GT is wrong");
            }
        }
        if (query.EQ) {
            if (Object.keys(query.EQ).length === 1) {
                if (typeof Object.keys(query.EQ)[0] !== "string") {
                    throw new InsightError("Invalid query! The mkey is not a string!");
                }
                let mkey: string = Object.keys(query.EQ)[0];
                let val = query.EQ[mkey];
                if (typeof val !== "number") {
                    throw new InsightError("Invalid query! The value of mkey is not a number!");
                } else {
                    return this.mKeycheck(mkey, id);
                }
            } else {
                throw new InsightError("Invalid MC! The filter in EQ is wrong");
            }
        }
    }

    private mKeycheck(mkey: string, id: string): boolean {
        let mfield0 = ["avg", "pass", "fail", "audit", "year"];
        if (!mkey.includes("_")) {
            throw new InsightError("Invalid query! The mkey is not a string with _!");
        }
        let mkeyid = mkey.split("_")[0];
        let mfield = mkey.split("_")[1];
        if (mkeyid.includes("_") || mfield.includes("_")) {
            throw new InsightError("Invalid query! The mkey contains more than one _!");
        }
        if (mkeyid === id) {
            if (mfield0.includes(mfield)) {
                return true;
            } else {
                throw new InsightError("Invalid mfield!");
            }
        } else {
            throw new InsightError("Invalid id of mfiled!");
        }
    }

    private SCcheck(query: any, id: string): boolean {
        let sfiled0: string[] = ["dept", "id", "instructor", "title", "uuid"];
        if (Object.keys(query.IS).length === 1) {
            if (typeof Object.keys(query.IS)[0] !== "string") {
                throw new InsightError("Invalid query! The skey is not a string!");
            }
            let skey: string = Object.keys(query.IS)[0];
            if (!skey.includes("_")) {
                throw new InsightError("Invalid query! The skey is not a string with _!");
            }
            let skeyid: string = skey.split("_")[0];
            let sfield: string = skey.split("_")[1];
            if (skeyid.includes("_") || sfield.includes("_")) {
                throw new InsightError("Invalid query! The skey contains more than one _!");
            }
            if (typeof query.IS[skey] !== "string") {
                throw new InsightError("Invalid query! The inputstring is not a string!");
            }
            if (skeyid === id) {
                if (sfiled0.includes(sfield)) {
                    return true;
                } else {
                    throw new InsightError("Invalid mfield!");
                }
            } else {
                throw new InsightError("Invalid id in skey!");
            }
        } else {
            throw new InsightError("Invalid filter in IS!");
        }
    }

    // check all Options: columns and ordered
    private checkValidOption(query: any, id: string): boolean {
        if (Object.keys(query).length < 1 || Object.keys(query).length > 2) {
            throw new InsightError("Invalid Options!");
        } else {
            return this.checkColumns(query, id) && this.checkOrder(query);
        }
    }

    private checkColumns(query: any, id: string): boolean {
        for (let col of query.COLUMNS) {
            if (typeof col !== "string") {
                throw new InsightError("Invalid query! At least one item in Column is not string");
            }
            if (! col.includes("_")) {
                throw new InsightError("Invalid query! The column is not a string with _!");
            }
            let col0 = col.split("_")[0];
            let col1 = col.split("_")[1];
            if (col0.includes("_") || col1.includes("_")) {
                throw new InsightError("Invalid query! The column contains more than one _!");
            }
        }
        let Column: string[] = query.COLUMNS;
        let Key: string[] = ["dept", "id", "instructor", "title", "uuid", "avg", "pass", "fail", "audit", "year"];
        if (Column.length >= 1) {
            for (let co of Column) {
                let coid = co.split("_")[0];
                let cofield = co.split("_")[1];
                if (coid !== id) {
                    throw new InsightError("Invalid Column with invalid id");
                }
                if (!Key.includes(cofield)) {
                    throw new InsightError("Invalid Column with invalid key");
                }
            }
            return true;
        } else {
            throw new InsightError("Invalid length of Columns");
        }
    }

    private checkOrder(query: any): boolean {
        if (Object.keys(query).length === 2 && query.ORDER == null) {
            throw new InsightError("Invalid keys in OPTIONS!");
        }
        if (Object.keys(query).length === 1 && query.ORDER == null) {
            return true;
        }
        if (query.COLUMNS.includes(query.ORDER)) {
            return true;
        } else {
            throw new InsightError("Invalid Order that not in Columns");
        }
    }
}
