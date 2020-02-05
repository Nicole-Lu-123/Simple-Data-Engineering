import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import {NotFoundError} from "restify";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses_allEmpty: "./test/data/courses_allEmpty.zip",
        courses_allMiSSresult: "./test/data/courses_allMiSSresult.zip",
        courses_someInvalid: "./test/data/courses_someInvalid.zip",
        invalid_courses_all_invalidJason: "./test/data/invalid_courses_all_invalidJason.zip",
        invalid_courses_empty: "./test/data/invalid_courses_empty.zip",
        invalid_courses_pic: "./test/data/invalid_courses_pic.zip",
        coursessmall: "./test/data/coursessmall.zip",
        smallcourse: "./test/data/smallcourse.zip",
        invalid_unzip: "./test/data/invalid_unzip.txt"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("Should add a small valid dataset", function () {
        const id: string = "smallcourse";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    it("Should add courses_allEmptyfiles_folder", function () {
        const id: string = "courses_allEmpty";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    ///
    it("Should add courses_someInvalid dataset", function () {
        const id: string = "courses_someInvalid";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    it("Should remove courses_someInvalid", function () {
        const id: string = "courses_someInvalid";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result1: string[]) => {
            return insightFacade.removeDataset(id);
        }).then((result: string) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should be removed");
        });

    });
    it("Should remove a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result1: string[]) => {
            return insightFacade.removeDataset(id);
        }).then((result: string) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should be removed");
        });

    });
    it("Should not add dataset already existed", function () {
        const id: string = "course";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        }).then((result2: string[]) => {
            expect.fail(result2, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add w/ spacedID", function () {
        const id: string = " ";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add w/ underscoredID", function () {
        const id: string = "course_underscored";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add w/ nullID", function () {
        const id: string = null;
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add w/ emptyID", function () {
        const id: string = "";
        return insightFacade.addDataset("", datasets[""], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add w/ undefinedID", function () {
        const id: string = "undefined";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should not remove");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add Empty folder", function () {
        const id: string = "invalid_courses_empty";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add Unzipped folder", function () {
        const id: string = "invalid_unzip";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add folder with invalid jason-picture(e.g.)", function () {
        const id: string = "invalid_courses_pic";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add folder with courses_allMiSSresult", function () {
        const id: string = "courses_allMiSSresult";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add folder with invalid jason files(syntax)", function () {
        const id: string = "invalid_courses_all_invalidJason";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not add folder with invalid folder name", function () {
        const id: string = "invalid_wrong_folder";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, null, "Should have rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not remove w/ nullID", function () {
        const id: string = null;
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, null, "Should not have removed");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not remove w/ emptyID", function () {
        const id: string = "";
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, null, "Should not remove");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not remove w/ undefinedID", function () {
        const id: any = undefined;
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, null, "Should not remove");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);
        });
    });
    it("Should  removecourses", function () {
        const id: string = "courses";
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, null, "Should not remove");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);
        });
    });
    it("Should not remove course_underscore", function () {
        const id: string = "course_underscore";
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, null, "Should not remove");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should not remove w/ undefinedID", function () {
        const id: string = " ";
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, null, "Should not remove");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Should correctly list all", function () {
        const id: string = "courses_allEmpty";
        const expected: InsightDataset[] = [{id: "courses", kind: InsightDatasetKind.Courses, numRows: 0}];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result[0].numRows).to.equal(expected[0].numRows);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should correctly list all");
        });
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: { path: string, kind: InsightDatasetKind } } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * TODO For C1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
});
