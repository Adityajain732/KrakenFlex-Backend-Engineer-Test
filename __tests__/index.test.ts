import axios from "axios";
import {
  getAllOutages,
  getSiteInfo,
  postOutagesToSite,
  filterOutagesByDateAndDevice,
  attachDeviceNamesToOutages,
  Outage,
  Device,
  SiteInfo,
  OutageWithDeviceName,
} from "../src/index";

jest.mock("axios");
const API_BASE_URL =
  "https://api.krakenflex.systems/interview-tests-mock-api/v1";
const API_KEY = "EltgJ5G8m44IzwE6UN2Y4B4NjPW77Zk6FJK3lL23";
const SITE_ID = "norwich-pear-tree";
const maxRetries = 3;

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("getAllOutages", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns an array of Outage objects", async () => {
    const mockOutages: Outage[] = [
      {
        id: "002b28fc-283c-47ec-9af2-ea287336dc1b",
        begin: "2022-01-01T00:00:00.000Z",
        end: "2022-01-02T00:00:00.000Z",
      },
    ];
    const response = { status: 200, data: mockOutages };

    mockedAxios.get.mockResolvedValue(response);

    const outages = await getAllOutages();
    expect(outages).toEqual(response.data);
    expect(mockedAxios.get).toHaveBeenCalledWith(`${API_BASE_URL}/outages`, {
      headers: { "x-api-key": API_KEY },
    });
  });

  it("throws error on 403 status code", async () => {
    const response = {
      status: 403,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getAllOutages()).rejects.toThrow(`Access denied`);
  });

  it("throws error on 429 status code", async () => {
    const response = {
      status: 429,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getAllOutages()).rejects.toThrow(`Too many requests`);
  });

  it("throws an error if received unexpected response status", async () => {
    const response = {
      status: 600,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getAllOutages()).rejects.toThrow(
      `Unexpected response status code: 600`
    );
  });

  it("retries the request up to maxRetries times if status code is 500", async () => {
    const response = {
      status: 500,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getAllOutages()).rejects.toThrow(
      `Reached max retries (${maxRetries}) for fetching outages`
    );
    expect(axios.get).toHaveBeenCalledTimes(maxRetries);
  });

  it("throws error on network error", async () => {
    const errorMessage = "Network error";
    mockedAxios.get.mockRejectedValue(new Error(errorMessage));
    await expect(getAllOutages()).rejects.toThrow(
      `Request failed: ${errorMessage}`
    );
  });
});

describe("getSiteInfo", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it("returns a SiteInfo object", async () => {
    const response = {
      data: {
        id: SITE_ID,
        name: "Norwich Pear Tree",
        devices: [
          { id: "002b28fc-283c-47ec-9af2-ea287336dc1b", name: "Battery 1" },
        ],
      },
      status: 200,
    };
    mockedAxios.get.mockResolvedValue(response);

    const siteInfo = await getSiteInfo(SITE_ID);

    expect(siteInfo).toEqual(response.data);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${API_BASE_URL}/site-info/${SITE_ID}`,
      { headers: { "x-api-key": API_KEY } }
    );
  });

  it("throws error on 403 status code", async () => {
    const response = {
      status: 403,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getSiteInfo(SITE_ID)).rejects.toThrow("Access denied");
  });

  it("throws error on 404 status code", async () => {
    const response = {
      status: 404,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getSiteInfo(SITE_ID)).rejects.toThrow(
      `Site with ID ${SITE_ID} not found`
    );
  });

  it("throws error on 429 status code", async () => {
    const response = {
      status: 429,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getSiteInfo(SITE_ID)).rejects.toThrow("Too many requests");
  });

  it("throws error on unexpected status code", async () => {
    const response = {
      status: 600,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getSiteInfo(SITE_ID)).rejects.toThrow(
      `Unexpected response status code: 600`
    );
  });

  it("retries the request up to maxRetries times if status code is 500", async () => {
    const response = {
      status: 500,
    };
    mockedAxios.get.mockRejectedValue(response);

    await expect(getSiteInfo(SITE_ID)).rejects.toThrow(
      `Reached max retries (${maxRetries}) for fetching site info`
    );
    expect(axios.get).toHaveBeenCalledTimes(maxRetries);
  });

  it("throws error on network error", async () => {
    const errorMessage = "Network error";
    mockedAxios.get.mockRejectedValue(new Error(errorMessage));
    await expect(getSiteInfo(SITE_ID)).rejects.toThrow(
      `Request failed: ${errorMessage}`
    );
  });
});

describe("postOutagesToSite", () => {
  const outages = [
    {
      id: "002b28fc-283c-47ec-9af2-ea287336dc1b",
      begin: "2022-01-01T00:00:00.000Z",
      end: "2022-01-02T00:00:00.000Z",
      name: "Battery 1",
    },
    {
      id: "086b0d53-b311-4441-aaf3-935646f03d4d",
      begin: "2022-01-03T00:00:00.000Z",
      end: "2022-01-04T00:00:00.000Z",
      name: "Battery 3",
    },
  ];

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should successfully post outages to the site", async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200 });

    await expect(postOutagesToSite(outages, SITE_ID)).resolves.toBeUndefined();

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/site-outages/${SITE_ID}`,
      outages,
      { headers: { "x-api-key": API_KEY } }
    );
  });

  it("throws error on 403 status code", async () => {
    const response = { response: { status: 403 } };
    mockedAxios.post.mockRejectedValueOnce(response);
    await expect(postOutagesToSite(outages, SITE_ID)).rejects.toThrow(
      "Access denied"
    );
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/site-outages/${SITE_ID}`,
      outages,
      {
        headers: { "x-api-key": API_KEY },
      }
    );
  });

  it("throws error on 404 status code", async () => {
    const response = { response: { status: 404 } };
    mockedAxios.post.mockRejectedValueOnce(response);
    await expect(postOutagesToSite(outages, SITE_ID)).rejects.toThrow(
      `Site with ID ${SITE_ID} not found`
    );
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/site-outages/${SITE_ID}`,
      outages,
      {
        headers: { "x-api-key": API_KEY },
      }
    );
  });

  it("throws error on 429 status code", async () => {
    const response = { response: { status: 429 } };
    mockedAxios.post.mockRejectedValueOnce(response);
    await expect(postOutagesToSite(outages, SITE_ID)).rejects.toThrow(
      "Too many requests"
    );
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/site-outages/${SITE_ID}`,
      outages,
      {
        headers: { "x-api-key": API_KEY },
      }
    );
  });

  it("throws error on unexpected status code", async () => {
    const response = { response: { status: 600 } };
    mockedAxios.post.mockRejectedValueOnce(response);
    await expect(postOutagesToSite(outages, SITE_ID)).rejects.toThrow(
      "Unexpected response status code: 600"
    );
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/site-outages/${SITE_ID}`,
      outages,
      {
        headers: { "x-api-key": API_KEY },
      }
    );
  });

  it("retries if status code is 500", async () => {
    mockedAxios.post.mockRejectedValueOnce({ response: { status: 500 } });
    mockedAxios.post.mockResolvedValueOnce({ status: 200 });

    await expect(postOutagesToSite(outages, SITE_ID)).resolves.toBeUndefined();

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/site-outages/${SITE_ID}`,
      outages,
      { headers: { "x-api-key": API_KEY } }
    );
  });

  it("should throw an error if posting outages fails after the maximum number of retries", async () => {
    mockedAxios.post.mockRejectedValue({ response: { status: 500 } });

    await expect(postOutagesToSite(outages, SITE_ID)).rejects.toThrow(
      `Reached max retries (${maxRetries}) to post site outages for ${SITE_ID}`
    );

    expect(axios.post).toHaveBeenCalledTimes(maxRetries);
    expect(axios.post).toHaveBeenCalledWith(
      `${API_BASE_URL}/site-outages/${SITE_ID}`,
      outages,
      { headers: { "x-api-key": API_KEY } }
    );
  });

  it("throws error on network error", async () => {
    const errorMessage = "Network error";
    mockedAxios.post.mockRejectedValue(new Error(errorMessage));
    await expect(postOutagesToSite(outages, SITE_ID)).rejects.toThrow(
      `Request failed: ${errorMessage}`
    );
  });
});

describe("filterOutagesByDateAndDevice", () => {
  const outages: Outage[] = [
    {
      id: "002b28fc-283c-47ec-9af2-ea287336dc1b",
      begin: "2022-01-01T00:00:00.000Z",
      end: "2022-01-02T00:00:00.000Z",
    },
    {
      id: "04ccad00-eb8d-4045-8994-b569cb4b64c1",
      begin: "2022-01-02T00:00:00.000Z",
      end: "2022-01-03T00:00:00.000Z",
    },
    {
      id: "086b0d53-b311-4441-aaf3-935646f03d4d",
      begin: "2021-12-31T00:00:00.000Z",
      end: "2022-01-01T00:00:00.000Z",
    },
  ];
  const siteInfo: SiteInfo = {
    id: SITE_ID,
    name: "Norwich Pear Tree",
    devices: [
      { id: "002b28fc-283c-47ec-9af2-ea287336dc1b", name: "Battery 1" },
      { id: "04ccad00-eb8d-4045-8994-b569cb4b64c1", name: "Battery 2" },
    ] as Device[],
  };
  afterEach(() => {
    jest.resetAllMocks();
  });
  it("should return an array with filtered outages based on date and device", () => {
    const filteredOutages = filterOutagesByDateAndDevice(outages, siteInfo);
    expect(filteredOutages).toEqual([
      {
        id: "002b28fc-283c-47ec-9af2-ea287336dc1b",
        begin: "2022-01-01T00:00:00.000Z",
        end: "2022-01-02T00:00:00.000Z",
      },
      {
        id: "04ccad00-eb8d-4045-8994-b569cb4b64c1",
        begin: "2022-01-02T00:00:00.000Z",
        end: "2022-01-03T00:00:00.000Z",
      },
    ]);
  });
});

describe("attachDeviceNamesToOutages", () => {
  const siteInfo: SiteInfo = {
    id: SITE_ID,
    name: "Norwich Pear Tree",
    devices: [
      { id: "002b28fc-283c-47ec-9af2-ea287336dc1b", name: "Battery 1" },
      { id: "04ccad00-eb8d-4045-8994-b569cb4b64c1", name: "Battery 2" },
    ],
  };

  const outages: Outage[] = [
    {
      id: "002b28fc-283c-47ec-9af2-ea287336dc1b",
      begin: "2022-01-02T00:00:00.000Z",
      end: "2022-01-02T01:00:00.000Z",
    },
    {
      id: "04ccad00-eb8d-4045-8994-b569cb4b64c1",
      begin: "2022-01-03T00:00:00.000Z",
      end: "2022-01-03T01:00:00.000Z",
    },
    {
      id: "086b0d53-b311-4441-aaf3-935646f03d4d",
      begin: "2022-01-04T00:00:00.000Z",
      end: "2022-01-04T01:00:00.000Z",
    },
  ];

  it("attaches device names to outages with matching device IDs", async () => {
    const expectedOutput: OutageWithDeviceName[] = [
      {
        id: "002b28fc-283c-47ec-9af2-ea287336dc1b",
        begin: "2022-01-02T00:00:00.000Z",
        end: "2022-01-02T01:00:00.000Z",
        name: "Battery 1",
      },
      {
        id: "04ccad00-eb8d-4045-8994-b569cb4b64c1",
        begin: "2022-01-03T00:00:00.000Z",
        end: "2022-01-03T01:00:00.000Z",
        name: "Battery 2",
      },
    ];
    const actualOutput = await attachDeviceNamesToOutages(outages, siteInfo);
    expect(actualOutput).toEqual(expectedOutput);
  });

  it("returns an empty array when the input array is empty", async () => {
    const expectedOutput: Outage[] = [];
    const actualOutput = await attachDeviceNamesToOutages([], siteInfo);
    expect(actualOutput).toEqual(expectedOutput);
  });

  it("returns an empty array when there are no matching device IDs", async () => {
    const expectedOutput: Outage[] = [];
    const actualOutput = await attachDeviceNamesToOutages(
      [
        {
          id: "27820d4a-1bc4-4fc1-a5f0-bcb3627e94a1",
          begin: "2022-01-04T00:00:00.000Z",
          end: "2022-01-04T01:00:00.000Z",
        },
      ],
      siteInfo
    );
    expect(actualOutput).toEqual(expectedOutput);
  });
});
