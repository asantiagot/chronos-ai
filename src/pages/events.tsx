import { useState, useEffect } from "react";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [nlPrompt, setNlPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("mistralai/Mistral-7B-Instruct-v0.3");

  const fetchEvents = async () => {
    const res = await fetch("/api/calendar");
    const data = await res.json();
    setEvents(data.items || []);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const createNlEvent = async () => {
    if (!nlPrompt.trim()) return;

    setLoading(true);
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "nl_create", prompt: nlPrompt, model })
    });
    await fetchEvents();
    setNlPrompt("");
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Your Events</h1>
      <ul className="mb-4 space-y-2">
        {events.map((event) => (
          <li key={event.id} className="p-2 border rounded shadow-sm">
            {event.summary} - {event.start?.dateTime}
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Create Event</h2>
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 border p-2 rounded"
            placeholder="Describe your event..."
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="mistralai/Mistral-7B-Instruct-v0.3">Mistral-7B</option>
            <option value="microsoft/phi4">Other Model</option>
          </select>
          <button
            onClick={createNlEvent}
            disabled={loading}
            className="bg-blue-500 text-white p-2 rounded disabled:bg-gray-400"
          >
            {loading ? "Generating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
