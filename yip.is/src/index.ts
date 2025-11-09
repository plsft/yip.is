interface Env {
	ASSETS: {
		fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
	};
}

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function addCorsHeaders(response: Response): Response {
	const newHeaders = new Headers(response.headers);
	Object.entries(corsHeaders).forEach(([key, value]) => {
		newHeaders.set(key, value);
	});
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		const { headers } = request;
		console.log("Request received:");
		console.log("User-Agent:", headers.get("user-agent"));
		console.log("Accept Header:", headers.get("accept"));
		const url = new URL(request.url);
		const ip = headers.get("cf-connecting-ip") || "Unknown";
		const userAgent = headers.get("user-agent") || "";
		const acceptHeader = headers.get("accept") || "";
		const cf = request.cf || {};
		const isp = cf.asOrganization || "Unknown";
		const asn = cf.asn || "Not available";
		const city = cf.city;
		const region = cf.region;
		const country = cf.country;
		const postalcode = cf.postalCode;
		const latitude = cf.latitude;
		const longitude = cf.longitude;
		const datacenter = cf.colo;
		const timezone = cf.timezone;
		const tlscipher = cf.tlsCipher;
		const locationParts = [city, region, country, postalcode].filter(Boolean);
		const location = locationParts.length > 0 ? locationParts.join(', ') : null;

		const details = { ip, isp, asn, location, latitude, longitude, datacenter, userAgent, timezone, tlscipher };

		if (url.protocol === "http:" && !userAgent.includes("curl") && !url.hostname.includes("localhost")) {
			const httpsUrl = url.href.replace("http:", "https:");
			return Response.redirect(httpsUrl, 301);
		}

		if (url.pathname === "/api") {
			const apiDocs = {
				name: "yip.is API",
				version: "1.0.0",
				description: "Fast IP address lookup and WHOIS information service",
				endpoints: {
					"GET /": {
						description: "Returns your IP address",
						response: "text/plain or text/html (based on User-Agent)"
					},
					"GET /details": {
						description: "Returns detailed information about your connection",
						response: "application/json",
						example: {
							ip: "1.2.3.4",
							isp: "Example ISP",
							asn: 12345,
							location: "City, State, Country",
							latitude: "12.345",
							longitude: "67.890",
							datacenter: "ABC",
							timezone: "America/New_York"
						}
					},
					"GET /{ip-or-domain}": {
						description: "Returns WHOIS information for the specified IP address or domain",
						response: "application/json",
						examples: ["/1.1.1.1", "/google.com"]
					},
					"GET /health": {
						description: "Health check endpoint",
						response: "application/json"
					}
				},
				usage: {
					curl: "curl yip.is",
					details: "curl yip.is/details",
					whois: "curl yip.is/1.1.1.1"
				}
			};
			return addCorsHeaders(new Response(JSON.stringify(apiDocs, null, 2), {
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "public, max-age=3600"
				},
			}));
		}

		if (url.pathname === "/health") {
			const health = {
				status: "ok",
				timestamp: new Date().toISOString(),
				service: "yip.is"
			};
			return addCorsHeaders(new Response(JSON.stringify(health, null, 2), {
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-cache"
				},
			}));
		}

		if (url.pathname === "/robots.txt") {
			const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://yip.is/sitemap.txt`;
			return new Response(robotsTxt, {
				headers: {
					"Content-Type": "text/plain",
					"Cache-Control": "public, max-age=86400"
				},
			});
		}

		if (url.pathname === "/sitemap.txt") {
			const sitemap = `https://yip.is/
https://yip.is/details
https://yip.is/api
https://yip.is/health`;
			return new Response(sitemap, {
				headers: {
					"Content-Type": "text/plain",
					"Cache-Control": "public, max-age=86400"
				},
			});
		}

		if (url.pathname.length > 1 && (
		    /^\/\d+\.\d+\.\d+\.\d+$/.test(url.pathname) || // IPv4
		    /^\/[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(url.pathname) || // Domain
		    /^\/[0-9a-fA-F:]+$/.test(url.pathname) // IPv6
		)) {
		  const target = url.pathname.substring(1);
		  
		  try {
		    const whoisResponse = await fetch(`http://ip-api.com/json/${target}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,reverse,mobile,proxy,hosting`);
		    const whoisData = await whoisResponse.json();
		    
		    const formattedData = {
		      query: whoisData.query || target,
		      status: whoisData.status,
		      country: whoisData.country,
		      countryCode: whoisData.countryCode,
		      region: whoisData.region,
		      regionName: whoisData.regionName,
		      city: whoisData.city,
		      zip: whoisData.zip,
		      lat: whoisData.lat,
		      lon: whoisData.lon,
		      timezone: whoisData.timezone,
		      isp: whoisData.isp,
		      org: whoisData.org,
		      as: whoisData.as
		    };

			if (whoisData.reverse) {
			  formattedData.hostname = whoisData.reverse;
			}		    
					try {
					  const rdapBootstrapUrl = /^\d+\.\d+\.\d+\.\d+$/.test(target) ? 
					    `https://rdap.org/ip/${target}` : 
					    `https://rdap.org/domain/${target}`;
					  
					  const bootstrapResponse = await fetch(rdapBootstrapUrl, {redirect: 'manual'});
					  
					  if (bootstrapResponse.status === 302) {
					    const actualRdapUrl = bootstrapResponse.headers.get('Location');
					    if (actualRdapUrl) {
					      const rdapResponse = await fetch(actualRdapUrl);
					      if (rdapResponse.ok) {
					        const rdapData = await rdapResponse.json();
					        
					        if (rdapData.objectClassName === "domain") {
					          if (rdapData.nameservers && rdapData.nameservers.length > 0) {
					            formattedData.nameservers = rdapData.nameservers.map(ns => ns.ldhName);
					          }
					          if (rdapData.events) {
					            rdapData.events.forEach(event => {
					              if (event.eventAction === "registration") {
					                formattedData.registered = event.eventDate;
					              }
					              if (event.eventAction === "expiration") {
					                formattedData.expires = event.eventDate;
					              }
					              if (event.eventAction === "last changed") {
					                formattedData.updated = event.eventDate;
					              }
					            });
					          }
					          if (rdapData.entities && rdapData.entities.length > 0) {
					            const registrarEntity = rdapData.entities.find(e => e.roles && e.roles.includes("registrar"));
					            if (registrarEntity) {
					              if (registrarEntity.vcardArray && registrarEntity.vcardArray[1]) {
					                const vcardData = registrarEntity.vcardArray[1];
					                const nameField = vcardData.find(f => f[0] === "fn");
					                if (nameField && nameField[3]) {
					                  formattedData.registrar = nameField[3];
					                }
					              }
					              
					              if (registrarEntity.entities && registrarEntity.entities.length > 0) {
					                const abuseEntity = registrarEntity.entities.find(e => e.roles && e.roles.includes("abuse"));
					                if (abuseEntity && abuseEntity.vcardArray && abuseEntity.vcardArray[1]) {
					                  const vcardData = abuseEntity.vcardArray[1];
					                  
					                  formattedData.abuseContact = {};
					                  
					                  const nameField = vcardData.find(f => f[0] === "fn");
					                  if (nameField && nameField[3]) {
					                    formattedData.abuseContact.name = nameField[3];
					                  }
					                  
					                  const emailField = vcardData.find(f => f[0] === "email");
					                  if (emailField && emailField[3]) {
					                    formattedData.abuseContact.email = emailField[3];
					                  }
					                  
					                  const telField = vcardData.find(f => f[0] === "tel");
					                  if (telField && telField[3]) {
					                    formattedData.abuseContact.phone = telField[3].replace('tel:', '');
					                  }
					                }
					              }
					            }
					            
					            const registrantEntity = rdapData.entities.find(e => e.roles && e.roles.includes("registrant"));
					            if (registrantEntity && registrantEntity.vcardArray && registrantEntity.vcardArray[1]) {
					              const vcardData = registrantEntity.vcardArray[1];
					              
					              formattedData.registrant = {};
					              
					              const nameField = vcardData.find(f => f[0] === "fn");
					              if (nameField && nameField[3]) {
					                formattedData.registrant.name = nameField[3];
					              }
					              
					              const emailField = vcardData.find(f => f[0] === "email");
					              if (emailField && emailField[3]) {
					                formattedData.registrant.email = emailField[3];
					              }
					              
					              const telField = vcardData.find(f => f[0] === "tel" && f[1].type === "voice");
					              if (telField && telField[3]) {
					                formattedData.registrant.phone = telField[3];
					              }
					              
					              const adrField = vcardData.find(f => f[0] === "adr");
					              if (adrField && adrField[1].label) {
					                formattedData.registrant.address = adrField[1].label;
					              }
					            }
					          }
					        }
					        
					        if (rdapData.objectClassName === "ip network") {
					          if (rdapData.startAddress && rdapData.endAddress) {
					            formattedData.ipRange = `${rdapData.startAddress} - ${rdapData.endAddress}`;
					          }
					          
					          if (rdapData.remarks) {
					            const descriptions = rdapData.remarks.flatMap(r => r.description || []);
					            if (descriptions.length > 0) {
					              formattedData.remarks = descriptions;
					            }
					          }
					          
					          if (rdapData.events) {
					            rdapData.events.forEach(event => {
					              if (event.eventAction === "registration") {
					                formattedData.registered = event.eventDate;
					              }
					              if (event.eventAction === "last changed") {
					                formattedData.updated = event.eventDate;
					              }
					            });
					          }
					          
					          if (rdapData.entities && rdapData.entities.length > 0) {
					            const registrant = rdapData.entities.find(e => e.roles && e.roles.includes("registrant"));
					            if (registrant && registrant.vcardArray && registrant.vcardArray[1]) {
					              const vcardData = registrant.vcardArray[1];
					              
					              const nameField = vcardData.find(f => f[0] === "fn");
					              if (nameField && nameField[3]) {
					                formattedData.registrant = {
					                  name: nameField[3]
					                };
					                
					                const emailField = vcardData.find(f => f[0] === "email");
					                if (emailField && emailField[3]) {
					                  formattedData.registrant.email = emailField[3];
					                }
					                
					                const telField = vcardData.find(f => f[0] === "tel" && f[1].type === "voice");
					                if (telField && telField[3]) {
					                  formattedData.registrant.phone = telField[3];
					                }
					                
					                const adrField = vcardData.find(f => f[0] === "adr");
					                if (adrField && adrField[1].label) {
					                  formattedData.registrant.address = adrField[1].label;
					                }
					              }
					            }
					            
					            const abuseContact = rdapData.entities.find(e => e.roles && e.roles.includes("abuse"));
					            if (abuseContact && abuseContact.vcardArray && abuseContact.vcardArray[1]) {
					              const vcardData = abuseContact.vcardArray[1];
					              
					              const nameField = vcardData.find(f => f[0] === "fn");
					              if (nameField && nameField[3]) {
					                formattedData.abuseContact = {
					                  name: nameField[3]
					                };
					                
					                const emailField = vcardData.find(f => f[0] === "email");
					                if (emailField && emailField[3]) {
					                  formattedData.abuseContact.email = emailField[3];
					                }
					                
					                const telField = vcardData.find(f => f[0] === "tel" && f[1].type === "voice");
					                if (telField && telField[3]) {
					                  formattedData.abuseContact.phone = telField[3];
					                }
					                
					                const adrField = vcardData.find(f => f[0] === "adr");
					                if (adrField && adrField[1].label) {
					                  formattedData.abuseContact.address = adrField[1].label;
					                }
					              }
					            }
					          }
					        }
					      }
					    }
					  }
					} catch (rdapError) {
					  console.error("RDAP lookup failed:", rdapError);
					}



		    return addCorsHeaders(new Response(JSON.stringify(formattedData, null, 2) + "\n", {
		      headers: { "Content-Type": "application/json" }
		    }));
		  } catch (error) {
		    console.error("Lookup error:", error);
		    return addCorsHeaders(new Response(JSON.stringify({ error: "Failed to fetch WHOIS data" }, null, 2), {
		      status: 500,
		      headers: { "Content-Type": "application/json" }
		    }));
		  }
		}

		if (url.pathname.startsWith("/whois")) {
			let targetIp = "";
			
			const ipPathMatch = url.pathname.match(/^\/whois\/([0-9.]+)$/);
			if (ipPathMatch && ipPathMatch[1]) {
				targetIp = ipPathMatch[1];
				console.log("Found IP in path:", targetIp);
			} else {
				targetIp = url.searchParams.get("ip") || ip;
				console.log("Using IP from param or visitor:", targetIp);
			}
			
			try {
				console.log("Fetching data for:", targetIp);
				const whoisResponse = await fetch(`http://ip-api.com/json/${targetIp}`);
				const whoisData = await whoisResponse.json();
				
				return addCorsHeaders(new Response(JSON.stringify(whoisData, null, 2) + "\n", {
					headers: { "Content-Type": "application/json" },
				}));
			} catch (error) {
				console.error("WHOIS lookup error:", error);
				return addCorsHeaders(new Response(JSON.stringify({ error: "Failed to fetch WHOIS data" }, null, 2), {
					status: 500,
					headers: { "Content-Type": "application/json" },
				}));
			}
		}

		if (url.pathname === "/details") {
			const ip = headers.get("cf-connecting-ip") || "Unknown";
			const cf = request.cf || {};
			const isp = cf.asOrganization || "Unknown";
			const asn = cf.asn || "Not available";
			const city = cf.city || "";
			const region = cf.region || "";
			const country = cf.country || "";
			const postalcode = cf.postalCode || "";
			const latitude = cf.latitude || "";
			const longitude = cf.longitude || "";
			const datacenter = cf.colo || "";
			const timezone = cf.timezone || "";
			const tlscipher = cf.tlsCipher || "";
			const locationParts = [city, region, country, postalcode].filter(Boolean);
			const location = locationParts.length > 0 ? locationParts.join(", ") : null;

			const details = { ip, isp, asn, location, latitude, longitude, datacenter, userAgent, timezone, tlscipher };

			return addCorsHeaders(new Response(`${JSON.stringify(details, null, 2)}\n`, {
				headers: { "Content-Type": "application/json" },
			}));
		}
				
		if (
			(url.pathname === "/" || url.pathname === "/details") &&
			(userAgent.toLowerCase().includes("curl") ||
				userAgent.toLowerCase().includes("wget") ||
				acceptHeader.includes("text/plain"))
		) {
			console.log("Request processed by curl or wget");
			const ip = headers.get("cf-connecting-ip") || "Unknown";
			return new Response(`${ip}\n`, {
				headers: { "Content-Type": "text/plain" },
			});
		}

		if (
			userAgent.toLowerCase().includes("curl") ||
			userAgent.toLowerCase().includes("wget") ||
			acceptHeader.includes("text/plain")
		) {
			return new Response("404 Not Found\n", {
				status: 404,
				headers: { "Content-Type": "text/plain" },
			});
		}

		/*if (url.pathname === "/b65bf7dc1b0348b587fa70578b445f59.txt") {
			return new Response("b65bf7dc1b0348b587fa70578b445f59", {
				headers: {
					"Content-Type": "text/plain",
					"Cache-Control": "public, max-age=3600"
				},
			});
		}*/

		try {
			const assetResponse = await env.ASSETS.fetch(request);
			if (assetResponse.status === 200) {
				return assetResponse;
			} 
		} catch (err) {
			console.log(err);
		}

		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		const nonce = btoa(String.fromCharCode(...array));

		const html = `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<link rel="canonical" href="https://yip.is">
					<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
					<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
					<link rel="shortcut icon" href="/favicon.ico">
					<link rel="apple-touch-icon" href="/apple-touch-icon.png">
					<link rel="manifest" href="/site.webmanifest">
					<link rel="icon" sizes="192x192" href="/android-chrome-192x192.png">
					<link rel="icon" sizes="512x512" href="/android-chrome-512x512.png">
					<link rel="stylesheet" href="/main.css">
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<meta name="description" content="Find your public IP address instantly with yip.is. View and copy your IP quickly and easily, no registration or extra steps required! Based on ip.now" />
					<meta name="keywords" content="What is my IP, IP address lookup, find my IP address, check my IP, IP location, WHOIS lookup" />
					<title>yip.is | Quick & Easy IP Lookup – Find Your IP Address Instantly - based on ip.now</title>
				</head>

				<body class="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 font-mono min-h-screen flex items-center justify-center p-4">
					<div class="w-full max-w-4xl mx-auto">
						<div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 relative animate-slide-in" id="ip-card">
						    <div class="absolute top-6 right-6 flex items-center gap-2 z-10">
						        <div class="max-w-0 overflow-hidden transition-all duration-300 ease-in-out" id="search-input-container">
						            <input type="text" class="w-48 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500" id="search-input" placeholder="IP or domain...">
						        </div>
								<button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer" id="search-icon">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-600 dark:text-gray-400">
									  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
									</svg>
								</button>
						    </div>

							<div class="mb-8 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-4 -mx-4 transition-all" id="ip">
								<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">IP Address</h3>
								<div class="flex items-center justify-between">
									<span id="ipvalue" class="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">${ip}</span>
									<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="hidden">
										<defs>
											<symbol id="copyToClipboard" viewBox="0 -960 960 960">
												<path d="M760-200H320q-33 0-56.5-23.5T240-280v-560q0-33 23.5-56.5T320-920h280l240 240v400q0 33-23.5 56.5T760-200ZM560-640v-200H320v560h440v-360H560ZM160-40q-33 0-56.5-23.5T80-120v-560h80v560h440v80H160Zm160-800v200-200 560-560Z" />
											</symbol>
											<symbol id="copyToClipboardCheckmark" fill="#10b981" viewBox="0 -960 960 960">
												<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
											</symbol>
										</defs>
									</svg>
									<button class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100">
										<svg class="w-6 h-6 text-gray-600 dark:text-gray-400">
											<use href="#copyToClipboard"></use>
										</svg>
									</button>
								</div>
							</div>

							${(isp || asn) ? `
							<div class="mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
								<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Provider</h3>
								<p class="text-lg text-gray-900 dark:text-gray-100">${isp || ''} ${asn ? `<span class="text-blue-600 dark:text-blue-400">ASN${asn}</span>` : ''}</p>
							</div>
							` : ''}

							${(city || region || country) ? `
							<div class="mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
								<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Location</h3>
								<p class="text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
									<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
									</svg>
									${[city, region, country].filter(Boolean).join(', ')}
								</p>
							</div>
							` : ''}

							<div id="device-section" class="hidden mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
								<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Device</h3>
								<p class="text-lg text-gray-900 dark:text-gray-100">
									<span id="browser-info"></span>, <span id="os-info"></span>
								</p>
							</div>

							<div class="flex justify-between items-center pt-4">
								<button class="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group" id="infobutton">
									<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" viewBox="0 -960 960 960" fill="currentColor">
										<path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
									</svg>
								</button>

								<div class="flex gap-2">
									<a href="https://github.com/plsft/ipnow" target="_blank" aria-label="GitHub" class="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
										<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" viewBox="0 0 496 512" fill="currentColor">
											<path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"/>
										</svg>
									</a>
								</div>
							</div>
						</div>

						<div class="hidden fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in z-50" id="notification">
							<div class="flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
								<span>Copied to clipboard!</span>
							</div>
						</div>

						<div class="hidden fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 flex items-center justify-center p-4" id="infomodalBackground">
							<div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-3xl max-h-[80vh] overflow-hidden animate-slide-in">
								<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
									<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100" id="modalTitle">JSON</h3>
									<button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" id="copyDetailsButton">
										<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-600 dark:text-gray-400">
											<use href="#copyToClipboard"></use>
										</svg>
									</button>
								</div>
								<div class="p-6 overflow-auto max-h-[calc(80vh-80px)]">
									<pre class="text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap break-words" id="curltext">${JSON.stringify(details, null, 2)}</pre>
								</div>
							</div>
						</div>
					</div>

				<script nonce="${nonce}">
					document.addEventListener('DOMContentLoaded', () => {
						const infoButton = document.getElementById('infobutton');
						infoButton.addEventListener('click', () => {
							document.getElementById('modalTitle').textContent = 'JSON';
							document.getElementById('curltext').textContent = ${JSON.stringify(JSON.stringify(details, null, 2))};
							toggleModal();
						});

						const copyIpButton = document.getElementById('ip');
						copyIpButton.addEventListener('click', () => {
							copyToClipboard('ipvalue', '#ip svg use');
						});

						const copyDetailsButton = document.getElementById('copyDetailsButton');
						copyDetailsButton.addEventListener('click', () => {
							copyToClipboard('curltext', '#copyDetailsButton svg use');
						});

						const osInfoElement = document.getElementById('os-info');
						const browserInfoElement = document.getElementById('browser-info');
						const deviceSection = document.getElementById('device-section');

						let platform = "Unknown platform";
						let browser = "Unknown browser";

						// Platform detection
						if (navigator.userAgentData?.platform) {
							platform = navigator.userAgentData.platform;
						} else {
							const userAgent = navigator.userAgent;
							if (/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
								platform = "iOS";
							} else if (userAgent.includes("Mac")) {
								platform = "macOS";
							} else if (userAgent.includes("Win")) {
								platform = "Windows";
							} else if (userAgent.includes("Linux")) {
								platform = "Linux";
							}
						}
						const userAgent = navigator.userAgent;

						if (navigator.brave) {
							browser = "Brave"; // Direct Brave detection
						} else if (/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
							// **iOS Browser Detection**
							if (userAgent.includes("CriOS")) {
								browser = "Chrome";
							} else if (userAgent.includes("FxiOS")) {
								browser = "Firefox";
							} else if (userAgent.includes("Brave")) {
								browser = "Brave";
							} else {
								browser = "Safari";
							}
						} else if (navigator.userAgentData?.brands) {
							const brands = navigator.userAgentData.brands.map(b => b.brand);
							
							if (brands.includes("Microsoft Edge")) {
								browser = "Edge";
							} else if (brands.includes("Google Chrome")) {
								browser = "Chrome";
							} else if (brands.includes("Brave")) {
								browser = "Brave";
							} else if (brands.includes("Chromium") && !brands.includes("Google Chrome") && userAgent.includes("Brave")) {
								browser = "Brave";
							} else if (brands.includes("Firefox")) {
								browser = "Firefox";
							} else if (brands.includes("Safari")) {
								browser = "Safari";
							}
						} else {
							if (userAgent.includes("Edg")) {
								browser = "Edge";
							} else if (userAgent.includes("Brave")) {
								browser = "Brave";
							} else if (userAgent.includes("Chrome")) {
								browser = "Chrome";
							} else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
								browser = "Safari";
							} else if (userAgent.includes("Firefox")) {
								browser = "Firefox";
							}
						}
						osInfoElement.textContent = platform;
						browserInfoElement.textContent = browser;

						if (platform !== "Unknown platform" && browser !== "Unknown browser") {
							deviceSection.classList.remove('hidden');
						}
					});

					function copyToClipboard(elementId, iconId) {
						const element = document.getElementById(elementId);
						const textToCopy = element.textContent || element.innerText;
						const copyToClipboardIcon = document.querySelector(iconId);
						navigator.clipboard.writeText(textToCopy).then(() => {
								copyToClipboardIcon.setAttribute('href', '#copyToClipboardCheckmark');
								setTimeout(() => {
									copyToClipboardIcon.setAttribute('href', '#copyToClipboard');
									copyToClipboardIcon.parentNode.setAttribute('fill', '#5f6368');
								}, 1500);						
						});
					}

					function toggleModal() {
						const modalBackground = document.getElementById("infomodalBackground");
						modalBackground.classList.toggle('hidden');
					}

					window.onclick = function(event) {
						const modalBackground = document.getElementById('infomodalBackground');
						if (event.target === modalBackground) {
							toggleModal();
						}
					}
					window.ontouchstart = function(event) {
						const modalBackground = document.getElementById('infomodalBackground');
						if (event.target === modalBackground) {
							toggleModal();
						}
					}
					window.addEventListener("keydown", function(event) {
						const modalBackground = document.getElementById("infomodalBackground");
						if (event.key === "Escape" && !modalBackground.classList.contains('hidden')) {
							toggleModal();
						}
					});
					const searchIcon = document.getElementById('search-icon');
					const searchInputContainer = document.getElementById('search-input-container');
					const searchInput = document.getElementById('search-input');
					const modalTitle = document.getElementById('modalTitle');
					const curltext = document.getElementById('curltext');

					searchIcon.addEventListener('click', () => {
						if (searchInputContainer.classList.contains('max-w-0')) {
							searchInputContainer.classList.remove('max-w-0');
							searchInputContainer.classList.add('max-w-xs');
							searchInput.focus();
						} else {
							searchInputContainer.classList.add('max-w-0');
							searchInputContainer.classList.remove('max-w-xs');
						}
					});

					searchInput.addEventListener('keypress', async (event) => {
						if (event.key === 'Enter') {
							const query = searchInput.value.trim();
							if (query) {
								searchForIpOrDomain(query);
							}
						}
					});

					async function searchForIpOrDomain(query) {
						try {
							modalTitle.textContent = 'WHOIS: ' + query;
							curltext.textContent = 'Loading...';
							toggleModal();
							
							const response = await fetch('/' + encodeURIComponent(query));
							
							if (!response.ok) {
								throw new Error('Failed to fetch data');
							}
							
							const data = await response.text();
							
							try {
								// Try to parse as JSON for formatted display
								const jsonData = JSON.parse(data);
								curltext.textContent = JSON.stringify(jsonData, null, 2);
							} catch (e) {
								// If not valid JSON, display as plain text
								curltext.textContent = data;
							}
							
						} catch (error) {
							curltext.textContent = 'Error: ' + error.message;
						}
					}
					document.addEventListener('click', (event) => {
					  if (!searchIcon.contains(event.target) &&
					      !searchInputContainer.contains(event.target) &&
					      !searchInputContainer.classList.contains('max-w-0')) {
					    searchInputContainer.classList.add('max-w-0');
					    searchInputContainer.classList.remove('max-w-xs');
					  }
					});
					searchInput.addEventListener('keydown', (event) => {
					  if (event.key === 'Escape' && !searchInputContainer.classList.contains('max-w-0')) {
					    searchInputContainer.classList.add('max-w-0');
					    searchInputContainer.classList.remove('max-w-xs');
					  }
					});
					document.addEventListener('keydown', (event) => {
					  // Check if Command (Mac) or Ctrl (Windows/Linux) + K is pressed
					  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
					    event.preventDefault(); // Prevent browser's default behavior
					    searchInputContainer.classList.remove('max-w-0');
					    searchInputContainer.classList.add('max-w-xs');
					    searchInput.focus();
					  }
					});
				</script>
				</body>
			</html>	  
		`;

		const notFoundResponse = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" href="/main.css">
				<title>404 Not Found</title>
           </head>
           <body class="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 font-mono min-h-screen flex items-center justify-center p-4">
             <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-12 max-w-2xl animate-slide-in text-center">
               <h1 class="text-6xl font-bold mb-4 text-red-500 dark:text-red-400">404</h1>
               <h2 class="text-2xl font-semibold mb-4">Not Found</h2>
               <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">Sorry, the page you're looking for does not exist.</p>
               <a href="/" class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors">Go Home</a>
             </div>
           </body>
           </html>
         `;

         if (url.pathname !== "/" && url.pathname !== "/details") {
           return new Response(notFoundResponse, {
             status: 404,
             headers: { "Content-Type": "text/html" },
           });
         }

         return new Response(html, {
           headers: {
             "Content-Type": "text/html",
             "Content-Security-Policy": `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; connect-src 'self' http://ip-api.com https://rdap.org;`
           }
         });
   }
};