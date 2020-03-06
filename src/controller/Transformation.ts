import {Decimal} from "decimal.js";

export default class Transformation {
    private groupresult: any[];

    constructor() {
        this.groupresult = [];
    }

    public transResult(trans: any, sections: any[]): any[] {
        let groups = trans.GROUP;
        let grouped = this.GroupBy(groups, sections);
        return this.ApplyResult(trans, grouped);
    }

    private GroupBy(keys: string[], sections: any[]): any[] {
        let length = keys.length;
        if (length === 0) {
            this.groupresult.push(sections);
            return sections;
        }
        let key0 = keys[0];
        let key1s = keys.slice(1, length);
        let set: string[] = [];
        for (let section of sections) {
            let value = section[key0];
            if (!set.includes(value)) {
                set.push(value);
            }
        }
        let result: any = {};
        for (let ele of set) {
            let group = this.GroupSelect(ele, key0, sections);
            result[ele] = this.GroupBy(key1s, group);
        }
        return this.groupresult;
    }

    private GroupSelect(ele: string, key: string, sections: any[]): any[] {
        return sections.filter(function (section) {
            return section[key] === ele;
        });
    }

    private ApplyResult(trans: any, groups: any[]): any[] {
        let applyResult = [];
        let groupreqs: string[] = trans.GROUP;
        let applyrules: any[] = trans.APPLY;
        for (let objlist of groups) {
            let res: any = {};
            for (let groupreq of groupreqs) {
                res[groupreq] = objlist[0][groupreq];
            }
            for (let applyrule of applyrules) {
                let applykey = Object.keys(applyrule)[0];
                res[applykey] = this.ApplyValue(applyrule[applykey], objlist);
            }
            applyResult.push(res);
        }
        return applyResult;
    }

    private ApplyValue(applytoken: any, groups: any[]): number {
        let apltoken = Object.keys(applytoken)[0];
        let key = applytoken[apltoken];
        if (apltoken === "MAX") {
            return this.findMax(key, groups);
        }
        if (apltoken === "MIN") {
            return this.findMin(key, groups);
        }
        if (apltoken === "AVG") {
            return this.findAvg(key, groups);
        }
        if (apltoken === "COUNT") {
            return this.findCount(key, groups);
        }
        if (apltoken === "SUM") {
            return this.findSum(key, groups);
        }
    }


    private findMax(key: string, groups: any[]): number {
        let max = 0;
        for (let group of groups) {
            if (group[key] > max) {
                max = group[key];
            }
        }
        return max;
    }

    private findMin(key: string, groups: any[]): number {
        let min = groups[0][key];
        for (let group of groups) {
            if (group[key] < min) {
                min = group[key];
            }
        }
        return min;
    }

    private findCount(key: string, groups: any[]): number {
        let sets: any[] = [];
        for (let group of groups) {
            let res = group[key];
            if (!sets.includes(res)) {
                sets.push(res);
            }
        }
        return sets.length;
    }

    private findAvg(key: string, groups: any[]): number {
        let dataset = [];
        for (let group of groups) {
            let res = group[key];
            dataset.push(res);
        }
        let total = new Decimal(0);
        for (let data of dataset) {
            let adata = new Decimal(data);
            total = Decimal.add(total, adata);
        }
        let numRows = groups.length;
        let avg = total.toNumber() / numRows;
        return Number(avg.toFixed(2));
    }


    private findSum(key: string, groups: any[]): number {
        let dataset = [];
        for (let group of groups) {
            let res = group[key];
            dataset.push(res);
        }
        let sum = new Decimal(0);
        for (let data of dataset) {
            let adata = new Decimal(data);
            sum = Decimal.add(sum, adata);
        }
        return Number(sum.toFixed(2));
    }
}
