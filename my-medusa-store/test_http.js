import axios from "axios";

async function run() {
  try {
    const res = await axios.get("http://localhost:9000/admin/b2b-quotes", {
      headers: {
        // We will pass the user ID as if we are authenticated
      },
      params: {
        debug_user_id: "user_01KT6YMPXMFY5TW945AXHQF994"
      }
    });

    console.log("Status:", res.status);
    console.log("Keys in response:", Object.keys(res.data));
    console.log("quotes length:", res.data.quotes?.length);
    if (res.data.quotes?.length > 0) {
      console.log("First quote ID:", res.data.quotes[0].id);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
