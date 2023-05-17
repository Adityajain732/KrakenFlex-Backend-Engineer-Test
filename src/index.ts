import axios, { AxiosError } from "axios";

const API_BASE_URL =
  "https://api.krakenflex.systems/interview-tests-mock-api/v1";
const API_KEY = "EltgJ5G8m44IzwE6UN2Y4B4NjPW77Zk6FJK3lL23";
const SITE_ID = "norwich-pear-tree";
const FILTER_DATE = "2022-01-01T00:00:00.000Z";
const retryDelay = 1000;
const maxRetries = 3;

export interface Outage {
  id: string;
  begin: string;
  end: string;
}

export interface Device {
  id: string;
  name: string;
}

export interface SiteInfo {
  id: string;
  name: string;
  devices: Device[];
}

export interface OutageWithDeviceName extends Outage {
  name: string;
}

export async function getAllOutages(): Promise<Outage[]> {
  let response;
  let retries = 0;
  const url = `${API_BASE_URL}/outages`;
  while (retries < maxRetries) {
    try {
      response = await axios.get(url, { headers: { "x-api-key": API_KEY } });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.status) {
        const status = axiosError.status;
        if (status === 500) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        } else if (status === 403) {
          throw new Error("Access denied");
        } else if (status === 429) {
          throw new Error("Too many requests");
        } else {
          throw new Error(`Unexpected response status code: ${status}`);
        }
      } else {
        throw new Error(`Request failed: ${axiosError.message}`);
      }
    }
    if (response && response.status === 200) {
      return response.data;
    }
  }
  throw new Error(`Reached max retries (${maxRetries}) for fetching outages`);
}

export async function getSiteInfo(siteId: string): Promise<SiteInfo> {
  let response;
  let retries = 0;
  const url = `${API_BASE_URL}/site-info/${siteId}`;
  while (retries < maxRetries) {
    try {
      response = await axios.get(url, { headers: { "x-api-key": API_KEY } });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.status) {
        const status = axiosError.status;
        if (status === 500) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        } else if (status === 403) {
          throw new Error("Access denied");
        } else if (status === 404) {
          throw new Error(`Site with ID ${siteId} not found`);
        } else if (status === 429) {
          throw new Error("Too many requests");
        } else {
          throw new Error(`Unexpected response status code: ${status}`);
        }
      } else {
        throw new Error(`Request failed: ${axiosError.message}`);
      }
    }
    if (response && response.status === 200) {
      return response.data;
    }
  }
  throw new Error(`Reached max retries (${maxRetries}) for fetching site info`);
}

export async function postOutagesToSite(
  outages: OutageWithDeviceName[],
  siteId: string
): Promise<void> {
  let response;
  let retries = 0;
  const url = `${API_BASE_URL}/site-outages/${siteId}`;
  while (retries < maxRetries) {
    try {
      response = await axios.post(url, outages, {
        headers: { "x-api-key": API_KEY },
      });
      return;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const { status } = axiosError.response;
        if (status === 500) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        } else if (status === 403) {
          throw new Error("Access denied");
        } else if (status === 404) {
          throw new Error(`Site with ID ${siteId} not found`);
        } else if (status === 429) {
          throw new Error("Too many requests");
        } else {
          throw new Error(`Unexpected response status code: ${status}`);
        }
      } else {
        throw new Error(`Request failed: ${axiosError.message}`);
      }
    }
  }
  throw new Error(
    `Reached max retries (${maxRetries}) to post site outages for ${siteId}`
  );
}

export function filterOutagesByDateAndDevice(
  outages: Outage[],
  siteInfo: SiteInfo
): Outage[] {
  const deviceIds = siteInfo.devices.map((device) => device.id);
  return outages.filter(
    (outage) => outage.begin >= FILTER_DATE && deviceIds.includes(outage.id)
  );
}

export async function attachDeviceNamesToOutages(
  outages: Outage[],
  siteInfo: SiteInfo
): Promise<OutageWithDeviceName[]> {
  const outagesWithDeviceName: OutageWithDeviceName[] = [];
  for (const outage of outages) {
    const device = siteInfo.devices.find((device) => device.id === outage.id);
    if (device) {
      const outageWithDeviceName: OutageWithDeviceName = {
        ...outage,
        name: device.name,
      };
      outagesWithDeviceName.push(outageWithDeviceName);
    }
  }
  return outagesWithDeviceName;
}

async function main(): Promise<void> {
  try {
    const outages = await getAllOutages();
    console.log("1. Fetched all Outages")
    const siteInfo = await getSiteInfo(SITE_ID);
    console.log("2. Fetched site information for the given site ID")
    const filteredOutages = filterOutagesByDateAndDevice(outages, siteInfo);
    console.log("3. Filtered Outages by start date and decide IDs")
    const outagesWithDeviceName = await attachDeviceNamesToOutages(
      filteredOutages,
      siteInfo
    );
    console.log("4. Attached Device names to Outages")
    await postOutagesToSite(outagesWithDeviceName, SITE_ID);
    console.log("5. Outages have been successfully posted to the given site ID");
  } catch (error) {
    console.error(error);
  }
}

if (require.main === module) {
  main();
}
