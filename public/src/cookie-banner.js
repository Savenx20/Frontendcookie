// Function to generate a short unique consent ID
function generateShortUUID() {
    return Math.random().toString(36).substring(2, 10);
}

// Document Ready Event
document.addEventListener("DOMContentLoaded", async () => {
    // DOM Elements
    const cookieBanner = document.getElementById("cookieConsent");
    const acceptCookiesButton = document.getElementById("acceptCookies");
    const rejectCookiesButton = document.getElementById("rejectCookies");
    const customizeCookiesButton = document.getElementById("customizeCookies");
    const savePreferencesButton = document.getElementById("savePreferences");
    const cancelPreferencesButton = document.getElementById("cancelPreferences");
    const cookiePreferencesModal = document.getElementById("cookiePreferencesModal");

    // Cookie Utility Functions
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;secure;samesite=strict`;
    }

    function getCookie(name) {
        const nameEq = `${name}=`;
        const cookieValue = document.cookie.split("; ").find((c) => c.startsWith(nameEq))?.split("=")[1];
        if (cookieValue) {
            console.log(`Retrieved cookie: ${name}=${decodeURIComponent(cookieValue)}`);
            return decodeURIComponent(cookieValue);
        }
        console.log(`Cookie not found: ${name}`);
        return null;
    }

    function deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;secure;samesite=strict`;
    }

    // Handle Cookie Consent Logic
    let consentId = getCookie("consentId");
    let cookiesAccepted = getCookie("cookiesAccepted");

    // Show cookie banner if no preference has been set
    if (!cookiesAccepted) {
        setTimeout(() => cookieBanner.classList.add("show"), 500);
    }

    // Show the cookie banner when the user attempts to register
    const registerTab = document.getElementById("register-tab");
    const registerForm = document.getElementById("registerForm");

    if (registerTab) {
        registerTab.addEventListener("click", () => {
            if (!cookiesAccepted) {
                setTimeout(() => cookieBanner.classList.add("show"), 500);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", (event) => {
            if (!cookiesAccepted) {
                event.preventDefault();
                alert("Please choose a cookie preference before registering.");
                setTimeout(() => cookieBanner.classList.add("show"), 500);
            }
        });
    }

    // Accept Cookies Button
    acceptCookiesButton.addEventListener("click", () => handleCookieConsent(true));

    // Reject Cookies Button
    rejectCookiesButton.addEventListener("click", () => handleCookieConsent(false));

    // Customize Cookies Button
    customizeCookiesButton.addEventListener("click", (event) => {
        event.preventDefault();
        cookiePreferencesModal.classList.add("show");
        document.getElementById("strictlyNecessary").checked = true;
        document.getElementById("strictlyNecessary").disabled = true;
    });

    // Save Preferences Button
    savePreferencesButton.addEventListener("click", () => {
        if (!consentId) {
            consentId = generateShortUUID();
            setCookie("consentId", consentId, 365);
        }

        console.log("📌 Using Consent ID:", consentId);

        const preferences = {
            strictlyNecessary: true,
            performance: document.getElementById("performance").checked,
            functional: document.getElementById("functional").checked,
            advertising: document.getElementById("advertising").checked,
            socialMedia: document.getElementById("socialMedia").checked,
        };

        setCookie("cookiesAccepted", "true", 365); // Custom preferences imply acceptance
        setCookie("cookiePreferences", JSON.stringify(preferences), 365);

        sendPreferencesToDB(consentId, preferences);

        // Log consent status with location data
        const consentStatus = preferences.performance || preferences.functional ? "accepted" : "rejected";
        saveLocationData(consentId, consentStatus);

        hideBanner();
        cookiePreferencesModal.classList.remove("show");
    });

    // Cancel Preferences Button
    cancelPreferencesButton.addEventListener("click", () => {
        cookiePreferencesModal.classList.remove("show");
    });

    // Hide Banner Function
    function hideBanner() {
        cookieBanner.classList.add("hide");
        setTimeout(() => {
            cookieBanner.classList.remove("show", "hide");
        }, 500);
    }

    // Send Preferences to Backend
    async function sendPreferencesToDB(consentId, preferences) {
        try {
            const response = await fetch("https://backendcookie-8qc1.onrender.com/api/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consentId, preferences }),
            });

            if (!response.ok) {
                throw new Error(`Failed to save preferences: ${response.status}`);
            }

            const result = await response.json();
            console.log("✅ Preferences saved:", result);
        } catch (error) {
            console.error("❌ Error saving preferences:", error.message || error);
        }
    }

    // Save Location Data
    async function saveLocationData(consentId, consentStatus) {
        try {
            const response = await fetch("https://ipinfo.io/json?token=10772b28291307");
            if (!response.ok) {
                throw new Error(`Failed to fetch IP data! Status: ${response.status}`);
            }
            const data = await response.json();

            const locationData = {
                consentId: String(consentId),
                ipAddress: data.ip || "unknown",
                country: data.country || "unknown",
                region: data.region || null,
                purpose: "consent-logging",
                consentStatus: consentStatus || "not-applicable"
            };

            const requiredFields = ["consentId", "ipAddress", "country", "purpose", "consentStatus"];
            for (const field of requiredFields) {
                if (!locationData[field] || typeof locationData[field] !== "string") {
                    throw new Error(`Invalid or missing field: ${field} must be a non-empty string`);
                }
            }

            console.log("Prepared location data:", JSON.stringify(locationData, null, 2));
            await sendLocationDataToDB(locationData);
        } catch (error) {
            console.error("❌ Error fetching or saving location data:", error.message || error);
        }
    }

    // Send Location Data to Backend
    async function sendLocationDataToDB(locationData) {
        try {
            const response = await fetch("https://backendcookie-8qc1.onrender.com/api/location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(locationData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to save location data: ${response.status} - ${errorData.message || "No details"}`);
            }

            const result = await response.json();
            console.log("✅ Location data saved:", result.message);
        } catch (error) {
            console.error("❌ Error sending location data to DB:", error.message || error);
        }
    }

    // Handle Cookie Consent
    function handleCookieConsent(accepted) {
        if (!consentId) {
            consentId = generateShortUUID();
            setCookie("consentId", consentId, 365);
        }

        console.log("📌 Using Consent ID:", consentId);

        const preferences = {
            strictlyNecessary: true,
            performance: accepted,
            functional: accepted,
            advertising: accepted,
            socialMedia: accepted,
        };

        setCookie("cookiesAccepted", accepted.toString(), 365);
        setCookie("cookiePreferences", JSON.stringify(preferences), 365);

        sendPreferencesToDB(consentId, preferences);

        // Log consent status with location data
        const consentStatus = accepted ? "accepted" : "rejected";
        saveLocationData(consentId, consentStatus);

        hideBanner();
    }
});