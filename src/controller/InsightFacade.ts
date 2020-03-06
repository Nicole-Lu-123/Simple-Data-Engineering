import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {JSZipObject} from "jszip";
import QueryBranch from "./QueryBranch";
import RoomBranch from "./RoomBranch";
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
let validFile: boolean;
const fs = require("fs");
let numRows: number = 0;

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

export interface DatasetHashMap {
    [key: string]: InsightDataset;
}

export default class InsightFacade implements IInsightFacade {
    // data Structures
    public myDatasetMap: Map<string, any[]>;  // {("id", [CourseSectio1, CourseSectio2, CourseSectio3]); ...}
    public dataSetsMap: Map<string, InsightDataset>; //  {("id", InsightDataset); ....}
    public dataSetsIDs: string[];   // { "" ; ""; "" }
    public querybranch: QueryBranch;

    constructor() {
        this.myDatasetMap = new Map<string, any[]>();
        this.dataSetsMap = new Map<string, InsightDataset>();
        this.dataSetsIDs = [];
        this.querybranch = new QueryBranch();
        Log.trace("InsightFacadeImpl::init()");

    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let self = this, PromiseSectionsArr: CourseSection[] = [], zip = new JSZip();
        numRows = 0;
        return new Promise((resolve, reject) => {
            if (self.badDatasetID(id) || self.badContent(content) || self.dataSetsIDs.includes(id)) {
                return reject(new InsightError("Invalid Input or existed dataset"));
            } else {
                if (kind === InsightDatasetKind.Rooms) {
                    let RoomData = new RoomBranch();
                    return RoomData.addData(id, content, kind).then((returnedValue: any) => {
                        self.storeInDataSet(id, kind, returnedValue);
                        return resolve(self.dataSetsIDs);
                    });
                } else if (kind === InsightDatasetKind.Courses) {
                    zip.loadAsync(content, {base64: true}).then((AllFiles) => {
                        let jsonCoursesFiles: any[] = [];
                        AllFiles.forEach(function (relativePath: string, file: JSZipObject) {
                            // check courses directory <-- helper 3 <--helper 4 no subfolder
                            validFile = self.validCoursesFile(relativePath, file);
                            if (validFile === true) {
                                jsonCoursesFiles.push(file.async("text"));
                            }
                        });
                        return jsonCoursesFiles;
                    }).then(function (jsonCoursesFiles: any) {
                        return Promise.all(jsonCoursesFiles);
                    }).then(function (jsonCoursesFiles: any) {
                        for (let aNewCourse of jsonCoursesFiles) {
                            let UnchainedSectionArr: CourseSection[] = [];
                            UnchainedSectionArr = self.makePreSavedSections(aNewCourse, id);
                            if (aNewCourse.length !== 0) {
                                PromiseSectionsArr = PromiseSectionsArr.concat(UnchainedSectionArr);
                            }
                        }
                    }).catch(function (e) {
                        return reject(new InsightError("unzip process failed!")); // catch unzip errors
                    }).then(() => {
                        try {
                            if (PromiseSectionsArr.length === 0) {
                                return reject(new InsightError());
                            }
                            this.storeInDataSet(id, kind, PromiseSectionsArr);
                            return resolve(self.dataSetsIDs);
                        } catch (e) {
                            return reject(new InsightError("promise all error"));
                        }
                    });
                }
            }
        });
    }

    private storeInDataSet(id: string, kind: InsightDatasetKind,
                           PromiseSectionsArr: any[]) {
        let self = this;
        self.dataSetsIDs.push(id);
        self.dataSetsMap.set(id, self.makeNewDataset(id, kind, PromiseSectionsArr.length));
        self.myDatasetMap.set(id, PromiseSectionsArr);
        let path = "./data/" + id + ".json";
        if (!fs.existsSync("./data/")) {
            fs.mkdirSync("./data/");
        }
        fs.writeFileSync(path, JSON.stringify(PromiseSectionsArr), "utf-8");
    }

    public removeDataset(id: string): Promise<string> {
        let self = this;
        return new Promise<string>(function (resolve, reject) {
            if (self.badDatasetID(id)) {
                return reject(new InsightError("invalid id"));
            } else {
                if (self.dataSetsIDs.includes(id)) {
                    self.myDatasetMap.delete(id);
                    self.dataSetsMap.delete(id);
                    self.dataSetsIDs.splice(self.dataSetsIDs.indexOf(id), 1);
                    let path = "./data/" + id + ".json";
                    fs.unlink(path, (err: any) => {
                        Log.trace(err);
                        Log.trace("path is deleted");
                        return resolve(id);
                    });
                } else {
                    return reject(new NotFoundError("there is no such id"));
                }
            }
        });
    }

    public performQuery(query: any): Promise<any[]> {
        try {
            let id = QueryBranch.getstring(query);
            if (this.dataSetsIDs.includes(id)) {
                let section = this.myDatasetMap.get(id);
                return this.querybranch.performQuery(query, section, id);
            } else if (fs.existsSync("./data/" + id + ".json")) {
                let contents = fs.readFileSync("./data/" + id + ".json");
                let jsonContent = JSON.parse(contents);
                this.myDatasetMap.set(id, jsonContent);
                let section = this.myDatasetMap.get(id);
                return this.querybranch.performQuery(query, section, id);
            } else {
                return Promise.reject("Not Found error");
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let self = this;
        let tempDatasats: InsightDataset[] = [];
        return new Promise<InsightDataset[]>(function (resolve, reject) {
            tempDatasats = Array.from(self.dataSetsMap.values());
            return resolve(tempDatasats);
        });
    }

    // Helper functions
    //
    // 1 -check input DatasetID
    public badDatasetID(id: string): boolean {
        if (id === null || id === undefined || id === "" || id.includes("_") || id.includes(" ")) { // ??? type of
            return true;    // return true if the id is null or undefined
        } else {
            return false;
        }
    }

    // 2 -check input content
    public badContent(content: string): boolean {
        if (content === null || content === undefined) {
            return true;    // return true if the id is null or undefined
        } else {
            return false;
        }
    }

    // 3 -check valid file under "courses" directory
    //   use helper 4 /check true if no subfolder, false then has sub_folder
    public validCoursesFile(relativePath: string, file: JSZipObject): boolean {
        if ((relativePath.indexOf("courses/") === 0) && (relativePath.indexOf("courses/") !== -1) // "courses/" is root
            && (file.dir === false)) {  // "the tail of this file  is not a folder"
            if (this.countFolder(relativePath) === 1) {
                return true;    // true if no subfolder,
            } else {
                return false;    // false then has sub_folder
            }
        }
    }

    // 4 - count folders(dir)
    public countFolder(relativePath: string): number {
        let count: number = (relativePath.match(/[/]/g) || []).length;
        return count;
    }

    // 5 - save the current jsonObj(file-course) to data structure.
    public makePreSavedSections(CourseJasonData: string, id: string): CourseSection[] {
        let currSections: any[] = [];
        try {
            let unstoredParsedCourseData = JSON.parse(CourseJasonData);
            for (let oneSection of unstoredParsedCourseData.result) {
                if (this.validSection(oneSection)) {
                    currSections.push(this.makeCorseSection(oneSection, id));
                    numRows++;
                }
            }
        } catch (e) {
            Log.trace(e);
        }
        return currSections;
    }

    // 6 - check if the section is valid
    public validSection(section: any) {
        return ((typeof (section.Subject) !== "undefined") && (typeof (section.Course) !== "undefined") &&
            (typeof (section.Avg) !== "undefined") && (typeof (section.Professor) !== "undefined")
            && (typeof (section.Title) !== "undefined") && (typeof (section.Pass) !== "undefined")
            && (typeof (section.Fail) !== "undefined") && (typeof (section.Audit) !== "undefined")
            && (typeof (section.id) !== "undefined") && (typeof (section.Year) !== "undefined"));
    }

    // 7 - make a new course section
    public makeCorseSection(section: any, id: string): CourseSection {
        // let tempSection: CourseSection = {
        //     courses_dept: section.Subject,
        //     courses_id: section.Course,
        //     courses_avg: section.Avg,
        //     courses_instructor: section.Professor,
        //     courses_title: section.Title,
        //     courses_pass: section.Pass,
        //     courses_fail: section.Fail,
        //     courses_audit: section.Audit,
        //     courses_uuid: this.setUUID(section.id),
        //     courses_year: Number(section.Year),
        // };
        // if (section.Section === "overall") {
        //     tempSection. courses_year = 1990;
        // }
        let courseObject: any = new Object();
        courseObject[id + "_dept"] = section.Subject;
        courseObject[id + "_id"] = section.Course;
        courseObject[id + "_avg"] = section.Avg;
        courseObject[id + "_instructor"] = section.Professor;
        courseObject[id + "_title"] = section.Title;
        courseObject[id + "_pass"] = section.Pass;
        courseObject[id + "_fail"] = section.Fail;
        courseObject[id + "_audit"] = section.Audit;
        courseObject[id + "_uuid"] = this.setUUID(section.id);
        courseObject[id + "_year"] = Number(section.Year);
        if (section["Section"] === "overall") {
            courseObject[id + "_year"] = 1900;
        }
        return courseObject;
    }

    // 8
    public setUUID(id: any) {
        return id.toString();
    }

    // 9 make new dataset
    public makeNewDataset(id: string, kind: InsightDatasetKind, length: number): InsightDataset {
        let newDataset = {
            id: id,
            kind: kind,
            numRows: length,
        };
        return newDataset;
    }
}
