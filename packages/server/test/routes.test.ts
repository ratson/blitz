/* eslint-disable import/first */
import {join, normalize, resolve} from "path"
import * as blitzVersion from "../src/blitz-version"
import {multiMock} from "./utils/multi-mock"
const mocks = multiMock(
  {
    "resolve-bin-async": {
      resolveBinAsync: jest.fn().mockImplementation((...a) => join(...a)), // just join the paths
    },
    "blitz-version": {
      getBlitzVersion: jest.fn().mockReturnValue(blitzVersion.getBlitzVersion()),
      isVersionMatched: jest.fn().mockImplementation(blitzVersion.isVersionMatched),
      saveBlitzVersion: jest.fn().mockImplementation(blitzVersion.saveBlitzVersion),
    },
  },
  resolve(__dirname, "../src"),
)

jest.mock("@blitzjs/config", () => {
  return {
    getConfig: jest.fn().mockReturnValue({}),
  }
})

// Import with mocks applied
import {RouteCache} from "@blitzjs/file-pipeline"
import {routes as getRoutes} from "../src/routes"

const originalLog = console.log
describe("Routes command", () => {
  let rootFolder: string
  let buildFolder: string
  let consoleOutput: string[] = []
  const mockedLog = (output: string) => consoleOutput.push(output)

  beforeEach(() => {
    console.log = mockedLog
    jest.clearAllMocks()
  })

  afterEach(() => {
    console.log = originalLog
  })

  describe("when run normally", () => {
    beforeEach(() => {
      rootFolder = resolve("dev")
      buildFolder = resolve(rootFolder, ".blitz-build")
    })
    afterEach(() => {
      mocks.mockFs.restore()
    })

    it("should not blow up", async () => {
      mocks.mockFs({
        "dev/_blitz-version.txt": "",
      })
      const transformFiles = () => Promise.resolve({routeCache: RouteCache.create()})
      await getRoutes({
        transformFiles,
        rootFolder,
        buildFolder: "",
        writeManifestFile: false,
        watch: false,
        port: 3000,
        hostname: "localhost",
        env: "dev",
      })
    })

    it("should get the right routes serialization", async () => {
      mocks.mockFs({
        "dev/.git/hooks": "",
        "dev/.vercel/project.json": "",
        "dev/app/api/auth.ts": "",
        "dev/app/auth/pages/login.ts": "",
        "dev/app/products/queries/getProducts.ts": "",
        "dev/app/products/mutations/updateProduct.ts": "",
      })
      const routes = await getRoutes({
        rootFolder,
        buildFolder,
        writeManifestFile: false,
        watch: false,
        port: 3000,
        hostname: "localhost",
        env: "dev",
      })

      expect(routes).toEqual([
        {path: normalize("app/api/auth.ts"), uri: "/api/auth", type: "api", verb: "*"},
        {path: normalize("app/auth/pages/login.ts"), uri: "/login", type: "page", verb: "get"},
        {
          path: normalize("app/products/mutations/updateProduct.ts"),
          uri: "/api/rpc/updateProduct",
          type: "rpc",
          verb: "post",
        },
        {
          path: normalize("app/products/queries/getProducts.ts"),
          uri: "/api/rpc/getProducts",
          type: "rpc",
          verb: "post",
        },
      ])
    })
  })
})
