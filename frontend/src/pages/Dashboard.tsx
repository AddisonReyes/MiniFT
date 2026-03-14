/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import MainLayout from "../layout/MainLayout";
import {
  createEntry,
  deleteEntry,
  getBalanceSummary,
  listEntries,
  signOut,
  type Entry,
  type BalanceSummary,
} from "../services/api";

type EntryTypeFilter = "" | "INCOME" | "EXPENSE";

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<EntryTypeFilter>("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "MXN" | "DOP">(
    "USD",
  );
  const [entryType, setEntryType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<
    "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  >("MONTHLY");
  const [repeatEvery, setRepeatEvery] = useState("1");
  const [repetitions, setRepetitions] = useState("12");

  async function refresh() {
    setError(null);
    setLoadingSummary(true);
    setLoadingEntries(true);
    try {
      const [s, e] = await Promise.all([
        getBalanceSummary(),
        listEntries(filterType === "" ? undefined : filterType),
      ]);
      setSummary(s);
      setEntries(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoadingSummary(false);
      setLoadingEntries(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [filterType]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    try {
      await createEntry({
        name,
        date,
        amount,
        currency,
        entry_type: entryType,
        is_recurring: isRecurring,
        recurring_data: isRecurring
          ? {
              frequency,
              repeat_every: toNumber(repeatEvery),
              repetitions: toNumber(repetitions),
            }
          : undefined,
      });

      setName("");
      setAmount("");
      setIsRecurring(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create entry");
    }
  }

  async function handleDelete(id: number) {
    const ok = confirm("Delete this entry?");
    if (!ok) return;
    setError(null);
    try {
      await deleteEntry(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete entry");
    }
  }

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <MainLayout>
      <div>
        <h1>Dashboard</h1>

        <button type="button" onClick={handleLogout}>
          Logout
        </button>
        <button type="button" onClick={() => void refresh()}>
          Refresh
        </button>

        {error ? (
          <p role="alert">
            <strong>Error:</strong> {error}
          </p>
        ) : null}

        <section>
          <h2>Balance</h2>
          {loadingSummary ? (
            <p>Loading...</p>
          ) : summary ? (
            <div>
              <p>Total income: {String(summary.total_income)}</p>
              <p>Total expense: {String(summary.total_expense)}</p>
              <p>Balance: {String(summary.balance)}</p>
            </div>
          ) : (
            <p>No data</p>
          )}
        </section>

        <section>
          <h2>New entry</h2>
          <form onSubmit={handleCreate}>
            <div>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="date">Date</label>
              <input
                id="date"
                name="date"
                type="date"
                value={date}
                onChange={(ev) => setDate(ev.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                name="amount"
                inputMode="decimal"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label htmlFor="currency">Currency</label>
              <select
                id="currency"
                name="currency"
                value={currency}
                onChange={(ev) =>
                  setCurrency(ev.target.value as "USD" | "EUR" | "MXN" | "DOP")
                }
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
                <option value="DOP">DOP</option>
              </select>
            </div>

            <div>
              <label htmlFor="entry_type">Type</label>
              <select
                id="entry_type"
                name="entry_type"
                value={entryType}
                onChange={(ev) =>
                  setEntryType(ev.target.value as "INCOME" | "EXPENSE")
                }
              >
                <option value="EXPENSE">EXPENSE</option>
                <option value="INCOME">INCOME</option>
              </select>
            </div>

            <div>
              <label htmlFor="is_recurring">Recurring</label>
              <input
                id="is_recurring"
                name="is_recurring"
                type="checkbox"
                checked={isRecurring}
                onChange={(ev) => setIsRecurring(ev.target.checked)}
              />
            </div>

            {isRecurring ? (
              <fieldset>
                <legend>Recurring config</legend>

                <div>
                  <label htmlFor="frequency">Frequency</label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={frequency}
                    onChange={(ev) =>
                      setFrequency(
                        ev.target.value as
                          | "DAILY"
                          | "WEEKLY"
                          | "MONTHLY"
                          | "YEARLY",
                      )
                    }
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="repeat_every">Repeat every</label>
                  <input
                    id="repeat_every"
                    name="repeat_every"
                    inputMode="numeric"
                    value={repeatEvery}
                    onChange={(ev) => setRepeatEvery(ev.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="repetitions">Repetitions</label>
                  <input
                    id="repetitions"
                    name="repetitions"
                    inputMode="numeric"
                    value={repetitions}
                    onChange={(ev) => setRepetitions(ev.target.value)}
                    required
                  />
                </div>
              </fieldset>
            ) : null}

            <button type="submit">Create</button>
          </form>
        </section>

        <section>
          <h2>Entries</h2>

          <div>
            <label htmlFor="filter">Filter</label>
            <select
              id="filter"
              name="filter"
              value={filterType}
              onChange={(ev) =>
                setFilterType(ev.target.value as "" | "INCOME" | "EXPENSE")
              }
            >
              <option value="">ALL</option>
              <option value="INCOME">INCOME</option>
              <option value="EXPENSE">EXPENSE</option>
            </select>
          </div>

          {loadingEntries ? (
            <p>Loading...</p>
          ) : entries.length === 0 ? (
            <p>No entries</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Recurring</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.name}</td>
                    <td>{e.entry_type}</td>
                    <td>{e.amount}</td>
                    <td>{e.currency}</td>
                    <td>
                      {e.is_recurring && e.recurring
                        ? `${e.recurring.frequency} / every ${e.recurring.repeat_every} / x${e.recurring.repetitions}`
                        : "-"}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void handleDelete(e.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </MainLayout>
  );
}

export default Dashboard;
