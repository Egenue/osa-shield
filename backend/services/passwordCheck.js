import { sha1 } from '../utils/sha1.js';

const API = "https://api.pwnedpasswords.com/range/";

export async function checkPassword(password) {
    const hash = sha1(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(`${API}${prefix}`);

    if (!response.ok) {
        throw new Error("Failed to fetch from HIBP API");
    }

    const data = await response.text();
    const lines = data.split("\n");

    const match = lines.find(line => line.startsWith(suffix));

    if (match) {
        const count = match.split(":")[1] || "1";
        return {
            breached: true,
            count: parseInt(count),
            message: `This password has been breached ${count} times`
        };
    } else {
        return {
            breached: false,
            count: 0,
            message: "This password has not been breached (according to HIBP)"
        };
    }
}