//for dev use the endpoint implementation of this is a get request of this format
//http://localhost:3001/urlCheck?url=http://testsafebrowsing.appspot.com/s/phishing.html

const API_BASE = "https://webrisk.googleapis.com/v1/uris:search";


export async function urlCheck(urlToCheck) {
  if (!urlToCheck) {
    throw new Error("URL is required");
  }

  //wEB RISK API to be replaced here contributers contact @batmvninarkham for API_KEY 
  const API_KEY = process.env.WEB_RISK_API;   

  const params = new URLSearchParams({
    uri: urlToCheck,
    key: API_KEY,
  });


  params.append("threatTypes", "SOCIAL_ENGINEERING");
  params.append("threatTypes", "MALWARE");
  params.append("threatTypes", "UNWANTED_SOFTWARE");

  const url = `${API_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Web Risk API request failed: ${response.status} - ${errorText}`);
  }

  const data= await response.json();
  if (data.threat && data.threat.threatTypes && data.threat.threatTypes.length > 0) {
    return {
      safe: false,
      threats: data.threat.threatTypes,
      expireTime: data.threat.expireTime,
      raw: data
    };
  } else {
    return {
      safe: true,
      threats: [],
      raw: data 
    };
  }
}
