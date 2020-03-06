import {InsightError} from "./IInsightFacade";
import CheckValid from "./CheckValid";

export default class CheckOptions {
    public CheckValidOption(query: any, id: string, key: string): boolean {
        let options = query.OPTIONS;
        if (Object.keys(options).length === 1) {
            if (options.COLUMNS) {
                return this.checkColumns(query, id, key);
            } else {
                throw new InsightError(" Invalid Options with no Column!");
            }
        } else if (Object.keys(options).length === 2) {
            if (options.COLUMNS && options.ORDER) {
                return this.checkColumns(query, id, key) && this.checkOrder(options);
            } else {
                throw new InsightError(" Invalid Options with no Column or first is not column!");
            }
        } else {
            throw new InsightError(" Invalid Options with invalid length!");
        }
    }

    private checkColumns(query: any, id: string, key: string): boolean {
        let columns = query.OPTIONS.COLUMNS;
        if (key === "KEY") {
            if (this.EasycheckColumnsKEYONLY(query)) {
                for (let col of columns) {
                    if (!this.checkKey(col, id)) {
                        return false;
                    }
                }
                return true;
            } else {
                throw new InsightError("Invalid query Column, no trans but not all keys");
            }
        } else if (key === "ANYKEY") {
            if (!Array.isArray(columns) || columns === null || columns.length < 1) {
                throw new InsightError("Invalid type of key in column");
            }
            for (let col of columns) {
                if (typeof col !== "string") {
                    throw new InsightError("Invalid query! At least one item in Column is not string");
                } else if (!this.checkANYKEY(col, id)) {
                    return false;
                }
            }
            return true;
        }
    }

    public EasycheckColumnsKEYONLY(query: any): boolean {
        let columns = query.OPTIONS.COLUMNS;
        if (!Array.isArray(columns) || columns === null || columns.length < 1) {
            throw new InsightError("Invalid column tyep or Column is null");
        }
        for (let column of columns) {
            if (typeof column !== "string" || !column.includes("_") || column.split("_").length !== 2) {
                throw new InsightError("Invalid type of key in column");
            } else if (column.split("_")[0] == null || column.split("_")[1] == null) {
                throw new InsightError("Invalid keys in column");
            } else if (column.split("_")[0] === "" || column.split("_")[1] === "") {
                throw new InsightError("Invalid keys in column");
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
        } else if (key === "") {
            throw new InsightError("Invalid applykey---empty string");
        } else {
            return true;
        }
    }

    private checkOrder(query: any): boolean {
        if (query.ORDER == null) {
            throw new InsightError("Invalid OPTIONS formation!");
        } else {
            return this.checkOrderele(query);
        }
    }

    private checkOrderele(query: any): boolean {
        let order = query.ORDER;
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

    private checkorderKeys(column: string[], keys: any[]): boolean {
        if (!Array.isArray(keys) || keys === null || keys.length < 1) {
            throw new InsightError("Invalid! null orderkey");
        }
        for (let key of keys) {
            if (typeof key !== "string" || !column.includes(key)) {
                throw new InsightError("Invalid key of Sort!");
            }
        }
        return true;
    }
}
