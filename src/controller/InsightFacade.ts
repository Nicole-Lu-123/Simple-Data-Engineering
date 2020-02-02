import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
const fs = require("fs");
// CourseSection Object
export interface CourseSection {
    courses_dept: string;
    courses_id: string;
    courses_avg: number;
    courses_instructor: string;
    courses_title: string;
    courses_pass: number;
    courses_fail: number;
    courses_audit: number;
    courses_uuid: string;
    courses_year: number;
}

export default class InsightFacade implements IInsightFacade {
    public datasetIDs: string[];
    public datasets: InsightDataset[];
    public myDatasetMap: Map<string, CourseSection[]>;
    public filteredDatasets: CourseSection[];
    constructor() {
        let self = this;
        self.datasetIDs = [];
        self.datasets = [];
        self.myDatasetMap = new Map<string, CourseSection[]>();
        self.filteredDatasets = [];
        Log.trace("InsightFacadeImpl::init()");
    }
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let self = this;
        // check the syntax of all input fields;
        if (self.badDatasetID(id) || self.badContent(content) || self.badKind(kind)) {
            return Promise.reject(new InsightError("Please check the ID, Content, or Kind! Potential invalid input."));
        }
        // check the existence of the input id
        if (this.existDatasetID(id)) {
            return Promise.reject(new InsightError("The Dataset has already exist"));
        }
        // star to addDataset
        // return new Promise(function (resolve, reject) {
        // });
    }

    public removeDataset(id: string): Promise<string> {
        let self = this;
        if (self.badDatasetID(id)) {
            return Promise.reject("Please check the ID, Content, or Kind! Potential invalid input.");
        }
        if (this.existDatasetID(id) === false) {
            return Promise.reject(new NotFoundError());
        }
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise <any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let self = this;
        return Promise.resolve(self.datasets);
    }
    // Helper Functions
    // AddDataset Input validity checking -1
    public badDatasetID(id: string): boolean {
        return (id.length === 0 || id === undefined || id === null || id.includes("_") || id.includes(" "));
    }
    // AddDataset Input validity checking -2
    public badContent(content: string): boolean {
        if (content === null || content === undefined) {
            return true ;
        } else {
            return false;
        }
    }
    // AddDataset Input validity checking -3
    public badKind(kind: InsightDatasetKind): boolean {
        if (kind === null || kind === undefined) {
            return true;
        } else {
            return false;
        }
    }
    // Check whehere the id has existed
    public existDatasetID (id: string): boolean {
        if (fs.existsSync("./data/" + id)) { // ??? includes right or not
            return true;
        } else {
            return false;
        }
    }
}
