import {InsightError} from "./IInsightFacade";
import CheckTrans from "./CheckTrans";
import CheckOptions from "./CheckOptions";
export default class CheckValid {
    public mfield0 = ["avg", "pass", "fail", "audit", "year"];
    public mfield1 = ["lat", "lon", "seats"];
    public sfield0 = ["dept", "id", "instructor", "title", "uuid"];
    public sfield1 = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];

    public CheckValid(query: any, id: string): boolean {
        let checkoptions = new CheckOptions();
        let elements: string[] = Object.keys(query);
        if (elements.length < 2 || elements.length > 3) {
            throw new InsightError(" Invalid query formation1!");
        }
        if (elements.length === 2) {
            if (query.WHERE == null || query.OPTIONS == null) {
                throw new InsightError("Invalid query formation2!");
            } else {
                return this.checkValidBody(query.WHERE, id) && checkoptions.CheckValidOption(query, id, "KEY");
            }
        } else {
            if (query.WHERE == null || query.OPTIONS == null) {
                throw new InsightError("Invalid query formation3!");
            }
            if (query.TRANSFORMATIONS) {
                if (this.checkValidBody(query.WHERE, id) && checkoptions.CheckValidOption(query, id, "ANYKEY")) {
                    let checktrans = new CheckTrans();
                    return checktrans.CheckTrans(query, id);
                } else {
                    throw new InsightError("Invalid query body or Options");
                }
            } else {
                throw new InsightError("Invalid query formation4!");
            }
        }
    }

    public givekeys(req: string, id: string): string[] {
        if (id === "courses") {
            if (req === "key") {
                return this.mfield0.concat(this.sfield0);
            }
            if (req === "mkey") {
                return this.mfield0;
            } else if (req === "skey") {
                return this.sfield0;
            }
        } else if (id === "rooms") {
            if (req === "key") {
                return this.mfield1.concat(this.sfield1);
            }
            if (req === "mkey") {
                return this.mfield1;
            } else if (req === "skey") {
                return this.sfield1;
            }
        } else {
            throw new InsightError("not the id defined");
        }
    }

    private checkValidBody(query: any, id: string): boolean {
        if (Object.keys(query).length === 1) {
            if (query.AND || query.OR || query.NOT || query.GT || query.EQ || query.LT || query.IS) {
                return this.checkValidFilter(query, id);
            } else {
                throw new InsightError("Invalid query! There is nothing in the filter");
            }
        } else if (Object.keys(query).length === 0) {
            return true;
        } else {
            throw new InsightError("Invalid filter in Where!");
        }
    }

    private checkValidFilter(query: any, id: string): boolean {
        if (query == null || Object.keys(query).length === 0) {
            throw new InsightError("Invalid! At least one filter is null.");
        }
        if (query.AND) {
            if (!Array.isArray(query.AND) || query.AND === null) {
                throw new InsightError("Invalid query, filter in And is in wrong type");
            } else {
                return this.LCcheckEach(query.AND, id);
            }
        }
        if (query.OR) {
            return this.LCcheckEach(query.OR, id);
        }
        if (query.GT || query.EQ || query.LT) {
            return this.MCcheck(query, id);
        }
        if (query.IS) {
            return this.SCcheck(query, id) && this.wildcheck(query.IS);
        }
        if (query.NOT) {
            return this.checkValidFilter(query.NOT, id);
        } else {
            throw new InsightError("Invalid query, filter in NOT is in wrong type");
        }
    }

    private wildcheck(ISquery: any): boolean {
        let wild: string = "*";
        let skey: string = Object.keys(ISquery)[0];
        if (typeof ISquery[skey] === "string") {
            let value: string = ISquery[skey];
            let valuelen = value.length;
            if (value.includes(wild)) {
                if (valuelen === 1) {
                    return true;
                }
                if (value.startsWith(wild) && value.endsWith(wild)) {
                    if (valuelen === 2) {
                        return true;
                    } else {
                        let realvalue = value.substring(1, valuelen - 1);
                        if (realvalue.includes(wild)) {
                            throw new InsightError("Invalid query for using wildcard in a wrong way!");
                        } else {
                            return true;
                        }
                    }
                } else if (value.startsWith(wild)) {
                    let realvalue = value.substring(1, valuelen);
                    if (realvalue.includes(wild)) {
                        throw new InsightError("Invalid query for using wildcard in a wrong way!");
                    } else {
                        return true;
                    }
                } else if (value.endsWith(wild)) {
                    let realvalue = value.substring(0, valuelen - 1);
                    if (realvalue.includes(wild)) {
                        throw new InsightError("Invalid query for using wildcard in a wrong way!");
                    } else {
                        return true;
                    }
                } else {
                    throw new InsightError("Invalid query! The wildcard in the wrong position");
                }
            } else {
                return true;
            }
        } else {
            throw new InsightError("Invalid query! The input string is not a string!");
        }

    }

    private LCcheckEach(LClist: any[], id: string): boolean {
        if (LClist.length >= 1) {
            for (let LC of LClist) {
                if (Object.keys(LC).length !== 1) {
                    throw new InsightError("Invalid query! The number of filters in object of AND are more than one ");
                }
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
                if (val == null || typeof val !== "number") {
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
                if (val == null || typeof val !== "number") {
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
                if (val == null || typeof val !== "number") {
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
        let mfields = this.givekeys("mkey", id);
        if (!mkey.includes("_")) {
            throw new InsightError("Invalid query! The mkey is not a string with _!");
        }
        let mkeylist = mkey.split("_");
        if (mkeylist.length !== 2) {
            throw new InsightError("Invalid query! The mkey contains more than one _!");
        }
        let mkeyid = mkey.split("_")[0];
        let mfield = mkey.split("_")[1];
        if (mkeyid === id) {
            if (mfields.includes(mfield)) {
                return true;
            } else {
                throw new InsightError("Invalid mfield!");
            }
        } else {
            throw new InsightError("Invalid id of mfiled!");
        }
    }

    private SCcheck(query: any, id: string): boolean {
        let sfileds = this.givekeys("skey", id);
        if (Object.keys(query.IS).length === 1) {
            if (typeof Object.keys(query.IS)[0] !== "string") {
                throw new InsightError("Invalid query! The skey is not a string!");
            }
            let skey: string = Object.keys(query.IS)[0];
            if (!skey.includes("_")) {
                throw new InsightError("Invalid query! The skey is not a string with _!");
            }
            let skeylist = skey.split("_");
            if (skeylist.length !== 2) {
                throw new InsightError("Invalid query! The skey contains more than one _!");
            }
            let skeyid: string = skey.split("_")[0];
            let sfield: string = skey.split("_")[1];
            if (typeof query.IS[skey] !== "string") {
                throw new InsightError("Invalid query! The inputstring is not a string!");
            }
            if (skeyid === id) {
                if (sfileds.includes(sfield)) {
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


}
