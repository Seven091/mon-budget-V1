import React, { useMemo, useState } from "react";

import {
  LayoutDashboard,
  WalletCards,
  Target,
  BarChart3,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Settings,
  Receipt,
  PiggyBank
} from "lucide-react";

import { initialData } from "./data";

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2
  }).format(value);

const formatDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));

function loadData() {
  try {
    const saved = localStorage.getItem("mon-budget-data");

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Impossible de charger les données.", error);
  }

  return initialData;
}

function App() {
  const [data, setData] = useState(loadData);
  const [activePage, setActivePage] = useState("dashboard");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState("expense");

  const currentMonth = data.months[data.currentMonth];

  const saveData = (newData) => {
    setData(newData);

    localStorage.setItem(
      "mon-budget-data",
      JSON.stringify(newData)
    );
  };

  const totals = useMemo(() => {
    const incomePlanned = currentMonth.income.reduce(
      (sum, item) => sum + item.planned,
      0
    );

    const incomeActual = currentMonth.income.reduce(
      (sum, item) => sum + item.actual,
      0
    );

    const fixedPlanned = currentMonth.fixedExpenses.reduce(
      (sum, item) => sum + item.planned,
      0
    );

    const fixedActual = currentMonth.fixedExpenses.reduce(
      (sum, item) => sum + item.actual,
      0
    );

    const envelopeBudget = currentMonth.envelopes.reduce(
      (sum, item) => sum + item.budget,
      0
    );

    const envelopeSpent = currentMonth.envelopes.reduce(
      (sum, item) => sum + item.spent,
      0
    );

    const savings = currentMonth.envelopes
      .filter((item) => item.name === "Épargne")
      .reduce((sum, item) => sum + item.spent, 0);

    const totalActualExpenses =
      fixedActual + envelopeSpent;

    const remaining =
      incomeActual -
      totalActualExpenses;

    const plannedRemaining =
      incomePlanned -
      fixedPlanned -
      envelopeBudget;

    return {
      incomePlanned,
      incomeActual,
      fixedPlanned,
      fixedActual,
      envelopeBudget,
      envelopeSpent,
      savings,
      remaining,
      plannedRemaining,
      totalActualExpenses
    };
  }, [currentMonth]);

  const addTransaction = (transaction) => {
    const month = data.months[data.currentMonth];

    const newTransaction = {
      ...transaction,
      id: `tx-${Date.now()}`
    };

    const updatedMonth = {
      ...month,
      transactions: [
        ...month.transactions,
        newTransaction
      ]
    };

    if (transaction.type === "expense") {
      updatedMonth.envelopes =
        month.envelopes.map((envelope) => {
          if (
            envelope.name === transaction.category
          ) {
            return {
              ...envelope,
              spent:
                envelope.spent +
                Number(transaction.amount)
            };
          }

          return envelope;
        });
    }

    if (transaction.type === "income") {
      updatedMonth.income = [
        ...month.income,
        {
          id: newTransaction.id,
          label: transaction.label,
          planned: Number(transaction.amount),
          actual: Number(transaction.amount)
        }
      ];
    }

    const newData = {
      ...data,
      months: {
        ...data.months,
        [data.currentMonth]: updatedMonth
      }
    };

    saveData(newData);
    setShowAddModal(false);
  };

  const navigate = (page) => {
    setActivePage(page);
  };

  return (
    <div className="app">

      <header className="topbar">
        <div>
          <h1>Mon Budget</h1>
          <span className="subtitle">
            Pilotage financier personnel
          </span>
        </div>

        <button
          className="icon-button"
          title="Paramètres"
        >
          <Settings size={20} />
        </button>
      </header>

      <main className="main">

        {activePage === "dashboard" && (
          <Dashboard
            month={currentMonth}
            totals={totals}
            onAdd={() => {
              setAddType("expense");
              setShowAddModal(true);
            }}
          />
        )}

        {activePage === "budget" && (
          <Budget
            month={currentMonth}
            totals={totals}
          />
        )}

        {activePage === "transactions" && (
          <Transactions
            transactions={currentMonth.transactions}
          />
        )}

        {activePage === "goals" && (
          <Goals
            goals={currentMonth.goals}
          />
        )}

        {activePage === "analysis" && (
          <Analysis
            month={currentMonth}
            totals={totals}
          />
        )}

      </main>

      <button
        className="floating-button"
        onClick={() => {
          setAddType("expense");
          setShowAddModal(true);
        }}
      >
        <Plus size={25} />
      </button>

      <nav className="bottom-nav">

        <NavButton
          active={activePage === "dashboard"}
          icon={<LayoutDashboard size={21} />}
          label="Accueil"
          onClick={() => navigate("dashboard")}
        />

        <NavButton
          active={activePage === "budget"}
          icon={<WalletCards size={21} />}
          label="Budget"
          onClick={() => navigate("budget")}
        />

        <div className="nav-spacer" />

        <NavButton
          active={activePage === "transactions"}
          icon={<Receipt size={21} />}
          label="Dépenses"
          onClick={() => navigate("transactions")}
        />

        <NavButton
          active={activePage === "goals"}
          icon={<Target size={21} />}
          label="Objectifs"
          onClick={() => navigate("goals")}
        />

      </nav>

      {showAddModal && (
        <AddTransactionModal
          type={addType}
          onClose={() => setShowAddModal(false)}
          onSave={addTransaction}
          envelopes={currentMonth.envelopes}
        />
      )}

    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick
}) {
  return (
    <button
      className={`nav-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Dashboard({
  month,
  totals,
  onAdd
}) {
  const alerts = month.envelopes.filter(
    (item) =>
      item.spent >= item.budget
  );

  return (
    <div className="page">

      <MonthSelector label={month.label} />

      <section className="hero-card">

        <div>
          <span>Reste disponible</span>

          <strong>
            {formatMoney(totals.remaining)}
          </strong>

          <small>
            Prévision fin de mois :{" "}
            {formatMoney(
              totals.plannedRemaining
            )}
          </small>
        </div>

        <div className="hero-icon">
          <WalletCards size={30} />
        </div>

      </section>

      <section className="stats-grid">

        <StatCard
          title="Revenus"
          value={totals.incomeActual}
          planned={totals.incomePlanned}
          icon={<ArrowUp size={18} />}
          positive
        />

        <StatCard
          title="Dépenses"
          value={totals.totalActualExpenses}
          planned={
            totals.fixedPlanned +
            totals.envelopeBudget
          }
          icon={<ArrowDown size={18} />}
        />

        <StatCard
          title="Épargne"
          value={totals.savings}
          icon={<PiggyBank size={18} />}
          positive
        />

      </section>

      <SectionTitle
        title="Enveloppes"
        action="Voir tout"
      />

      <div className="envelope-list">

        {month.envelopes
          .slice(0, 5)
          .map((envelope) => (
            <EnvelopeCard
              key={envelope.id}
              envelope={envelope}
            />
          ))}

      </div>

      <SectionTitle
        title="Alertes"
        action=""
      />

      {alerts.length === 0 ? (
        <div className="empty-card">
          <CheckCircle2 size={20} />
          <span>
            Aucun dépassement détecté.
          </span>
        </div>
      ) : (
        <div className="alert-list">
          {alerts.map((envelope) => (
            <div
              className="alert-card"
              key={envelope.id}
            >
              <AlertTriangle size={21} />

              <div>
                <strong>
                  {envelope.name}
                </strong>

                <p>
                  Budget dépassé de{" "}
                  {formatMoney(
                    envelope.spent -
                      envelope.budget
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="primary-button full"
        onClick={onAdd}
      >
        <Plus size={19} />
        Ajouter une dépense
      </button>

    </div>
  );
}

function MonthSelector({ label }) {
  return (
    <div className="month-selector">
      <button>
        <ChevronLeft size={20} />
      </button>

      <strong>{label}</strong>

      <button>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

function StatCard({
  title,
  value,
  planned,
  icon,
  positive
}) {
  return (
    <div className="stat-card">

      <div className="stat-header">
        <span>{title}</span>

        <div
          className={
            positive
              ? "stat-icon positive"
              : "stat-icon"
          }
        >
          {icon}
        </div>
      </div>

      <strong>
        {formatMoney(value)}
      </strong>

      {planned !== undefined && (
        <small>
          Prévu : {formatMoney(planned)}
        </small>
      )}

    </div>
  );
}

function EnvelopeCard({ envelope }) {
  const percentage =
    envelope.budget === 0
      ? 0
      : (envelope.spent /
          envelope.budget) *
        100;

  const status =
    percentage >= 100
      ? "danger"
      : percentage >= 80
      ? "warning"
      : "normal";

  return (
    <div className="envelope-card">

      <div className="envelope-top">

        <strong>
          {envelope.name}
        </strong>

        <span>
          {formatMoney(envelope.spent)}
          {" / "}
          {formatMoney(envelope.budget)}
        </span>

      </div>

      <div className="progress">
        <div
          className={`progress-bar ${status}`}
          style={{
            width: `${Math.min(
              percentage,
              100
            )}%`
          }}
        />
      </div>

      <div className="envelope-bottom">

        <span>
          {percentage.toFixed(0)} %
        </span>

        <span
          className={
            percentage >= 100
              ? "danger-text"
              : ""
          }
        >
          {percentage >= 100
            ? `+${formatMoney(
                envelope.spent -
                  envelope.budget
              )}`
            : `Reste ${formatMoney(
                envelope.budget -
                  envelope.spent
              )}`}
        </span>

      </div>

    </div>
  );
}

function SectionTitle({
  title,
  action
}) {
  return (
    <div className="section-title">

      <h2>{title}</h2>

      {action && (
        <button>
          {action}
        </button>
      )}

    </div>
  );
}

function Budget({
  month,
  totals
}) {
  return (
    <div className="page">

      <PageTitle
        title="Budget"
        subtitle="Prévu contre réel"
      />

      <section className="summary-card">

        <div>
          <span>Revenus prévus</span>
          <strong>
            {formatMoney(
              totals.incomePlanned
            )}
          </strong>
        </div>

        <div>
          <span>Revenus réels</span>
          <strong>
            {formatMoney(
              totals.incomeActual
            )}
          </strong>
        </div>

        <div>
          <span>Reste prévisionnel</span>
          <strong>
            {formatMoney(
              totals.plannedRemaining
            )}
          </strong>
        </div>

      </section>

      <SectionTitle
        title="Charges fixes"
      />

      <div className="simple-list">

        {month.fixedExpenses.map(
          (expense) => (
            <div
              className="simple-row"
              key={expense.id}
            >
              <span>
                {expense.label}
              </span>

              <div>
                <strong>
                  {formatMoney(
                    expense.actual
                  )}
                </strong>

                <small>
                  prévu{" "}
                  {formatMoney(
                    expense.planned
                  )}
                </small>
              </div>
            </div>
          )
        )}

      </div>

      <SectionTitle
        title="Enveloppes"
      />

      <div className="simple-list">

        {month.envelopes.map(
          (envelope) => (
            <div
              className="simple-row"
              key={envelope.id}
            >
              <span>
                {envelope.name}
              </span>

              <div>
                <strong>
                  {formatMoney(
                    envelope.spent
                  )}
                </strong>

                <small>
                  budget{" "}
                  {formatMoney(
                    envelope.budget
                  )}
                </small>
              </div>
            </div>
          )
        )}

      </div>

    </div>
  );
}

function Transactions({
  transactions
}) {
  return (
    <div className="page">

      <PageTitle
        title="Transactions"
        subtitle="Vos mouvements récents"
      />

      <div className="transaction-list">

        {[...transactions]
          .reverse()
          .map((transaction) => (
            <div
              className="transaction-card"
              key={transaction.id}
            >

              <div className="transaction-icon">
                {transaction.type ===
                "expense" ? (
                  <ArrowDown size={18} />
                ) : (
                  <ArrowUp size={18} />
                )}
              </div>

              <div className="transaction-info">

                <strong>
                  {transaction.label}
                </strong>

                <span>
                  {formatDate(
                    transaction.date
                  )}
                  {" · "}
                  {transaction.payment}
                </span>

              </div>

              <strong
                className={
                  transaction.type ===
                  "expense"
                    ? "amount-expense"
                    : "amount-income"
                }
              >
                {transaction.type ===
                "expense"
                  ? "-"
                  : "+"}
                {formatMoney(
                  transaction.amount
                )}
              </strong>

            </div>
          ))}

      </div>

    </div>
  );
}

function Goals({
  goals
}) {
  return (
    <div className="page">

      <PageTitle
        title="Objectifs"
        subtitle="Construire les projets futurs"
      />

      <div className="goal-list">

        {goals.map((goal) => {

          const percentage =
            goal.target === 0
              ? 0
              : (goal.current /
                  goal.target) *
                100;

          return (
            <div
              className="goal-card"
              key={goal.id}
            >

              <div className="goal-header">

                <div>
                  <strong>
                    {goal.name}
                  </strong>

                  <span>
                    Objectif :{" "}
                    {formatMoney(
                      goal.target
                    )}
                  </span>
                </div>

                <Target size={22} />

              </div>

              <div className="progress">

                <div
                  className="progress-bar normal"
                  style={{
                    width: `${Math.min(
                      percentage,
                      100
                    )}%`
                  }}
                />

              </div>

              <div className="goal-values">

                <strong>
                  {formatMoney(
                    goal.current
                  )}
                </strong>

                <span>
                  {percentage.toFixed(0)} %
                </span>

              </div>

              <div className="goal-footer">

                <span>
                  Reste{" "}
                  {formatMoney(
                    goal.target -
                      goal.current
                  )}
                </span>

                <span>
                  {formatMoney(
                    goal.monthlyContribution
                  )}
                  /mois
                </span>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}

function Analysis({
  month,
  totals
}) {
  const expenseRatio =
    totals.incomeActual === 0
      ? 0
      : (totals.totalActualExpenses /
          totals.incomeActual) *
        100;

  return (
    <div className="page">

      <PageTitle
        title="Analyse"
        subtitle="Comprendre votre mois"
      />

      <section className="analysis-card">

        <h3>
          Taux de dépenses
        </h3>

        <strong>
          {expenseRatio.toFixed(1)} %
        </strong>

        <p>
          Part des revenus déjà consommée
          par les dépenses.
        </p>

      </section>

      <section className="analysis-card">

        <h3>
          Situation
        </h3>

        <div className="analysis-row">
          <span>Revenus</span>
          <strong>
            {formatMoney(
              totals.incomeActual
            )}
          </strong>
        </div>

        <div className="analysis-row">
          <span>Dépenses</span>
          <strong>
            {formatMoney(
              totals.totalActualExpenses
            )}
          </strong>
        </div>

        <div className="analysis-row">
          <span>Épargne</span>
          <strong>
            {formatMoney(
              totals.savings
            )}
          </strong>
        </div>

        <div className="analysis-row total">
          <span>Reste</span>
          <strong>
            {formatMoney(
              totals.remaining
            )}
          </strong>
        </div>

      </section>

      <section className="analysis-card">

        <h3>
          Enveloppes à surveiller
        </h3>

        {month.envelopes
          .filter(
            (item) =>
              item.spent /
                item.budget >=
              0.8
          )
          .map((item) => (
            <div
              className="analysis-row"
              key={item.id}
            >
              <span>{item.name}</span>

              <strong>
                {(
                  (item.spent /
                    item.budget) *
                  100
                ).toFixed(0)}
                %
              </strong>
            </div>
          ))}

      </section>

    </div>
  );
}

function PageTitle({
  title,
  subtitle
}) {
  return (
    <div className="page-title">

      <h2>{title}</h2>

      <p>{subtitle}</p>

    </div>
  );
}

function AddTransactionModal({
  type,
  onClose,
  onSave,
  envelopes
}) {
  const [form, setForm] = useState({
    label: "",
    amount: "",
    category:
      envelopes[0]?.name ||
      "Autre",
    payment: "Carte bancaire",
    date:
      new Date()
        .toISOString()
        .split("T")[0]
  });

  const submit = (event) => {
    event.preventDefault();

    if (
      !form.label ||
      !form.amount
    ) {
      return;
    }

    onSave({
      ...form,
      type,
      amount: Number(form.amount)
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >

      <div
        className="modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="modal-header">

          <div>
            <h2>
              Nouvelle dépense
            </h2>

            <span>
              Enregistrer un mouvement
            </span>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <X size={21} />
          </button>

        </div>

        <form onSubmit={submit}>

          <label>
            Libellé

            <input
              value={form.label}
              onChange={(e) =>
                setForm({
                  ...form,
                  label: e.target.value
                })
              }
              placeholder="Ex : Carrefour"
              autoFocus
            />
          </label>

          <label>
            Montant

            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value
                })
              }
              placeholder="0,00"
            />
          </label>

          <label>
            Catégorie

            <select
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category:
                    e.target.value
                })
              }
            >

              {envelopes.map(
                (envelope) => (
                  <option
                    key={envelope.id}
                    value={envelope.name}
                  >
                    {envelope.name}
                  </option>
                )
              )}

              <option value="Charges fixes">
                Charges fixes
              </option>

            </select>

          </label>

          <label>
            Moyen de paiement

            <select
              value={form.payment}
              onChange={(e) =>
                setForm({
                  ...form,
                  payment:
                    e.target.value
                })
              }
            >
              <option>
                Carte bancaire
              </option>

              <option>
                Espèces
              </option>

              <option>
                Carte restaurant
              </option>

              <option>
                Prélèvement
              </option>

              <option>
                Virement
              </option>

              <option>
                Chèque
              </option>
            </select>

          </label>

          <label>
            Date

            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm({
                  ...form,
                  date: e.target.value
                })
              }
            />

          </label>

          <button
            className="primary-button full"
            type="submit"
          >
            Enregistrer
          </button>

        </form>

      </div>

    </div>
  );
}

export default App;
