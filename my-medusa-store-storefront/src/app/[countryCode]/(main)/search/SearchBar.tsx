"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const params = useParams();
  const countryCode = params.countryCode as string || "us";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Teleport the user to the search page with their query!
      router.push(`/${countryCode}/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="d-flex" style={{ maxWidth: "300px" }}>
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          placeholder="Search for groceries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <button className="btn btn-success px-3" type="submit" aria-label="Search">
          <i className="icofont-search"></i>
        </button>
      </div>
    </form>
  );
}