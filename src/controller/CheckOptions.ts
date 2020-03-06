import {InsightError} from "./IInsightFacade";
import CheckValid from "./CheckValid";


export default class CheckOptions {
    public CheckValidOption(query: any, id: string): boolean {
        if (Object.keys(query).length === 1 || Object.keys(query).length === 2) {
            if (query.COLUMNS) {
                return this.checkColumns(query, id) && this.checkOrder(query);
            } else {
                throw new InsightError("Invalid Options with no Column!");
            }
        } else {
            throw new InsightError("Invalid Options!");
        }
    }

    private checkColumns(query: any, id: string): boolean {
        let columns = query.COLUMNS;
        for (let col of columns) {
            if (typeof col !== "string") {
                throw new InsightError("Invalid query! At least one item in Column is not string");
            } else {
                if (!this.checkANYKEY(col, id)) {
                    return false;
                }
            }
        }
        return true;
    }

    private checkANYKEY(key: string, id: string): boolean {
        return (this.checkKey(key, id) || this.checkApplykey(key));
    }


    public checkKey(key: string, id: string): boolean {
        let checkValid = new CheckValid();
        let keys = checkValid.givekeys("key", id);
        if (!key.includes("_")) {
            return false;
        } else {
            let keylist = key.split("_");
            if (keylist.length !== 2) {
                throw new InsightError("Invalid query! The column contains more than one _!");
            } else {
                let key0 = key.split("_")[0];
                let key1 = key.split("_")[1];
                if (key0 !== id) {
                    throw new InsightError("Invalid Column with invalid id");
                }
                if (!keys.includes(key1)) {
                    throw new InsightError("Invalid Column with invalid key");
                }
            }
            return true;
        }
    }

    public checkApplykey(key: string): boolean {
        if (key.includes("_")) {
            throw new InsightError("Invalid applykey");
        } else {
            return true;
        }
    }

    private checkOrder(query: any): boolean {
        if (Object.keys(query).length === 1) {
            return true;
        } else {
            if (query.ORDER == null) {
                throw new InsightError("Invalid OPTIONS formation!");
            } else {
                return this.checkOrderele(query);
            }
        }
    }

    private checkOrderele(query: any): boolean {
        let order: any = query.ORDER;
        let column = query.COLUMNS;
        if (typeof order === "string") {
            if (column.includes(order)) {
                return true;
            } else {
                throw new InsightError("Invalid Order that not in column!");
            }
        } else if (typeof order === "object") {
            if (order.dir && order.keys && Object.keys(order).length === 2) {
                if (this.checkDirection(order.dir) && this.checkorderKeys(column, order.keys)) {
                    return true;
                } else {
                    throw new InsightError("Invalid formation of Object in Sort!");
                }
            } else {
                throw new InsightError("Invalid formation of Object in Sort!");
            }
        } else {
            throw new InsightError("Invalid formation of Sort!");
        }
    }

    private checkDirection(dir: string): boolean {
        if (dir === "UP" || dir === "DOWN") {
            return true;
        } else {
            throw new InsightError("Invalid direction of Sort!");
        }
    }

    private checkorderKeys(column: string[], keys: string[]): boolean {
        for (let key of keys) {
            if (!column.includes(key)) {
                throw new InsightError("Invalid direction of Sort!");
            }
        }
        return true;
    }
}
