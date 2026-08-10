import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Target,
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
  PiggyBank,
} from "lucide-react";
import { initialData } from "./data";

const DATA_VERSION = 3;
const STORAGE_KEY = "mon-budget-data-v3";

/* ============================================================
   OUTILS
============================================================ */

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));

const toNumber = (value) =>
  Number(value) || 0;

/* ============================================================
   DONNÉES
============================================================ */

function loadData() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {
        ...initialData,
        dataVersion: DATA_VERSION,
      };
    }

    const parsed = JSON.parse(saved);

    if (
      parsed?.dataVersion !==
      DATA_VERSION
    ) {
      return {
        ...initialData,
        dataVersion: DATA_VERSION,
      };
    }

    return parsed;
  } catch {
    return {
      ...initialData,
      dataVersion: DATA_VERSION,
    };
  }
}

/* ============================================================
   MOIS
============================================================ */

function shiftMonth(monthKey, amount) {
  const [year, month] =
    monthKey.split("-").map(Number);

  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabel(monthKey) {
  const [year, month] =
    monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(year, month - 1, 1)
  );
}

function createMonthFromTemplate(
  sourceMonth,
  monthKey
) {
  return {
    label: getMonthLabel(monthKey),

    income: sourceMonth.income.map(
      (item) => ({
        ...item,
      })
    ),

    fixedExpenses:
      sourceMonth.fixedExpenses.map(
        (item) => ({
          ...item,
          actual: 0,
        })
      ),

    envelopes:
      sourceMonth.envelopes.map(
        (item) => ({
          ...item,
          spent: 0,
        })
      ),

    transactions: [],

    goals: sourceMonth.goals.map(
      (goal) => ({
        ...goal,
      })
    ),
  };
}

function ensureMonthExists(
  budgetData,
  monthKey
) {
  if (budgetData.months[monthKey]) {
    return budgetData;
  }

  const keys = Object.keys(
    budgetData.months
  ).sort();

  const templateKey =
    keys.find(
      (key) => key <= monthKey
    ) || keys[0];

  return {
    ...budgetData,

    months: {
      ...budgetData.months,

      [monthKey]:
        createMonthFromTemplate(
          budgetData.months[
            templateKey
          ],
          monthKey
        ),
    },
  };
}

/* ============================================================
   CALCULS DES TRANSACTIONS
============================================================ */

function getFixedExpensePaid(
  month,
  fixedExpenseId
) {
  return month.transactions
    .filter(
      (transaction) =>
        transaction.type ===
          "expense" &&
        transaction.fixedExpenseId ===
          fixedExpenseId
    )
    .reduce(
      (sum, transaction) =>
        sum +
        toNumber(transaction.amount),
      0
    );
}

function getEnvelopeSpent(
  month,
  envelopeName
) {
  return month.transactions
    .filter(
      (transaction) =>
        transaction.type ===
          "expense" &&
        transaction.category ===
          envelopeName
    )
    .reduce(
      (sum, transaction) =>
        sum +
        toNumber(transaction.amount),
      0
    );
}

/* ============================================================
   NOUVEAU :
   CALCUL DU REVENU ENCAISSÉ
============================================================ */

function getIncomeReceived(
  month,
  incomeId
) {
  return month.transactions
    .filter(
      (transaction) =>
        transaction.type ===
          "income" &&
        transaction.incomeId ===
          incomeId
    )
    .reduce(
      (sum, transaction) =>
        sum +
        toNumber(transaction.amount),
      0
    );
}

/* ============================================================
   APPLICATION
============================================================ */

function App() {
  const [data, setData] =
    useState(loadData);

  const [
    activePage,
    setActivePage,
  ] = useState("dashboard");

  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);

  const currentMonth =
    data.months[data.currentMonth];

  /* ==========================================================
     SAUVEGARDE
  ========================================================== */

  const saveData = (newData) => {
    const finalData = {
      ...newData,
      dataVersion:
        DATA_VERSION,
    };

    setData(finalData);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(finalData)
    );
  };

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const changeMonth = (
    direction
  ) => {
    const newMonthKey =
      shiftMonth(
        data.currentMonth,
        direction
      );

    const prepared =
      ensureMonthExists(
        data,
        newMonthKey
      );

    saveData({
      ...prepared,
      currentMonth:
        newMonthKey,
    });
  };

  /* ==========================================================
     CALCULS
  ========================================================== */

  const totals = useMemo(() => {

    /* --------------------------------------------------------
       REVENUS
    -------------------------------------------------------- */

    const incomeDetails =
      currentMonth.income.map(
        (income) => {

          const planned =
            toNumber(
              income.planned
            );

          const received =
            getIncomeReceived(
              currentMonth,
              income.id
            );

          const remaining =
            Math.max(
              planned - received,
              0
            );

          const overrun =
            Math.max(
              received - planned,
              0
            );

          return {
            ...income,
            planned,
            received,
            remaining,
            overrun,
          };
        }
      );

    const moneyIncome =
      incomeDetails.filter(
        (income) =>
          income.type !==
          "benefit"
      );

    const benefits =
      incomeDetails.filter(
        (income) =>
          income.type ===
          "benefit"
      );

    const incomePlanned =
      moneyIncome.reduce(
        (sum, income) =>
          sum + income.planned,
        0
      );

    const incomeActual =
      moneyIncome.reduce(
        (sum, income) =>
          sum + income.received,
        0
      );

    const incomeRemaining =
      moneyIncome.reduce(
        (sum, income) =>
          sum + income.remaining,
        0
      );

    const benefitPlanned =
      benefits.reduce(
        (sum, income) =>
          sum + income.planned,
        0
      );

    const benefitReceived =
      benefits.reduce(
        (sum, income) =>
          sum + income.received,
        0
      );

    const benefitRemaining =
      benefits.reduce(
        (sum, income) =>
          sum + income.remaining,
        0
      );

    /* --------------------------------------------------------
       CHARGES FIXES
    -------------------------------------------------------- */

    const fixedDetails =
      currentMonth.fixedExpenses.map(
        (expense) => {

          const planned =
            toNumber(
              expense.planned
            );

          const paid =
            getFixedExpensePaid(
              currentMonth,
              expense.id
            );

          const remaining =
            Math.max(
              planned - paid,
              0
            );

          const overrun =
            Math.max(
              paid - planned,
              0
            );

          return {
            ...expense,
            planned,
            paid,
            remaining,
            overrun,
          };
        }
      );

    const fixedPlanned =
      fixedDetails.reduce(
        (sum, expense) =>
          sum + expense.planned,
        0
      );

    const fixedActual =
      fixedDetails.reduce(
        (sum, expense) =>
          sum + expense.paid,
        0
      );

    const fixedRemaining =
      fixedDetails.reduce(
        (sum, expense) =>
          sum + expense.remaining,
        0
      );

    const fixedOverrun =
      fixedDetails.reduce(
        (sum, expense) =>
          sum + expense.overrun,
        0
      );

    /* --------------------------------------------------------
       ENVELOPPES
    -------------------------------------------------------- */

    const envelopeDetails =
      currentMonth.envelopes.map(
        (envelope) => {

          const budget =
            toNumber(
              envelope.budget
            );

          const spent =
            getEnvelopeSpent(
              currentMonth,
              envelope.name
            );

          const remaining =
            Math.max(
              budget - spent,
              0
            );

          const overrun =
            Math.max(
              spent - budget,
              0
            );

          return {
            ...envelope,
            budget,
            spent,
            remaining,
            overrun,
          };
        }
      );

    const envelopeBudget =
      envelopeDetails.reduce(
        (sum, envelope) =>
          sum + envelope.budget,
        0
      );

    const envelopeSpent =
      envelopeDetails.reduce(
        (sum, envelope) =>
          sum + envelope.spent,
        0
      );

    const envelopeRemaining =
      envelopeDetails.reduce(
        (sum, envelope) =>
          sum + envelope.remaining,
        0
      );

    const overBudget =
      envelopeDetails.reduce(
        (sum, envelope) =>
          sum + envelope.overrun,
        0
      );

    const savingsDetails =
      envelopeDetails.filter(
        (item) =>
          item.name === "Épargne"
      );

    const savings =
      savingsDetails.reduce(
        (sum, item) =>
          sum + item.spent,
        0
      );

    const savingsBudget =
      savingsDetails.reduce(
        (sum, item) =>
          sum + item.budget,
        0
      );

    const variableDetails =
      envelopeDetails.filter(
        (item) =>
          item.name !== "Épargne"
      );

    const variableBudget =
      variableDetails.reduce(
        (sum, item) =>
          sum + item.budget,
        0
      );

    const variableSpent =
      variableDetails.reduce(
        (sum, item) =>
          sum + item.spent,
        0
      );

    /* --------------------------------------------------------
       SYNTHÈSE
    -------------------------------------------------------- */

    const actualExpenses =
      fixedActual +
      variableSpent;

    const plannedExpenses =
      fixedPlanned +
      variableBudget;

    const availableNow =
      incomeActual -
      fixedActual -
      envelopeSpent;

    const availableAfterFixed =
      incomeActual -
      fixedRemaining -
      envelopeSpent;

    const forecastEnd =
      availableNow -
      envelopeRemaining;

    const plannedEnd =
      incomePlanned -
      fixedPlanned -
      variableBudget -
      savingsBudget;

    const expenseRate =
      incomeActual === 0
        ? 0
        : (actualExpenses /
            incomeActual) *
          100;

    return {
      incomeDetails,

      incomePlanned,
      incomeActual,
      incomeRemaining,

      benefitPlanned,
      benefitReceived,
      benefitRemaining,

      fixedDetails,
      fixedPlanned,
      fixedActual,
      fixedRemaining,
      fixedOverrun,

      envelopeDetails,
      envelopeBudget,
      envelopeSpent,
      envelopeRemaining,
      overBudget,

      variableBudget,
      variableSpent,

      savings,
      savingsBudget,

      actualExpenses,
      plannedExpenses,

      availableNow,
      availableAfterFixed,
      forecastEnd,
      plannedEnd,

      expenseRate,
    };

  }, [currentMonth]);

  /* ==========================================================
     AJOUT TRANSACTION
  ========================================================== */

  const addTransaction = (
    transaction
  ) => {

    const amount =
      toNumber(
        transaction.amount
      );

    if (amount <= 0) {
      return;
    }

    const newTransaction = {
      ...transaction,
      id: `tx-${Date.now()}`,
      amount,
      date:
        transaction.date ||
        new Date()
          .toISOString()
          .split("T")[0],
    };

    const updatedMonth = {
      ...currentMonth,

      transactions: [
        ...currentMonth.transactions,
        newTransaction,
      ],
    };

    saveData({
      ...data,

      months: {
        ...data.months,

        [data.currentMonth]:
          updatedMonth,
      },
    });

    setShowAddModal(false);
  };

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <div className="app">

      <header className="topbar">

        <div>
          <h1>
            Mon Budget
          </h1>

          <span className="subtitle">
            Pilotage financier personnel
          </span>
        </div>

        <button
          className="icon-button"
          type="button"
        >
          <Settings size={20} />
        </button>

      </header>

      <main className="main">

        {activePage ===
          "dashboard" && (
          <Dashboard
            month={currentMonth}
            totals={totals}
            onAdd={() =>
              setShowAddModal(true)
            }
            onPreviousMonth={() =>
              changeMonth(-1)
            }
            onNextMonth={() =>
              changeMonth(1)
            }
          />
        )}

        {activePage ===
          "budget" && (
          <Budget
            month={currentMonth}
            totals={totals}
          />
        )}

        {activePage ===
          "transactions" && (
          <Transactions
            transactions={
              currentMonth.transactions
            }
          />
        )}

        {activePage ===
          "goals" && (
          <Goals
            goals={currentMonth.goals}
          />
        )}

        {activePage ===
          "analysis" && (
          <Analysis
            month={currentMonth}
            totals={totals}
          />
        )}

      </main>

      <button
        className="floating-button"
        onClick={() =>
          setShowAddModal(true)
        }
        type="button"
      >
        <Plus size={25} />
      </button>

      <nav className="bottom-nav">

        <NavButton
          active={
            activePage ===
            "dashboard"
          }
          icon={
            <LayoutDashboard size={21} />
          }
          label="Accueil"
          onClick={() =>
            setActivePage("dashboard")
          }
        />

        <NavButton
          active={
            activePage ===
            "budget"
          }
          icon={
            <WalletCards size={21} />
          }
          label="Budget"
          onClick={() =>
            setActivePage("budget")
          }
        />

        <div className="nav-spacer" />

        <NavButton
          active={
            activePage ===
            "transactions"
          }
          icon={
            <Receipt size={21} />
          }
          label="Dépenses"
          onClick={() =>
            setActivePage(
              "transactions"
            )
          }
        />

        <NavButton
          active={
            activePage ===
            "goals"
          }
          icon={
            <Target size={21} />
          }
          label="Objectifs"
          onClick={() =>
            setActivePage("goals")
          }
        />

      </nav>

      {showAddModal && (
        <AddTransactionModal
          onClose={() =>
            setShowAddModal(false)
          }
          onSave={addTransaction}
          envelopes={
            currentMonth.envelopes
          }
          fixedExpenses={
            currentMonth.fixedExpenses
          }
          incomes={
            currentMonth.income
          }
        />
      )}

    </div>
  );
}

/* ============================================================
   NAVIGATION
============================================================ */

function NavButton({
  active,
  icon,
  label,
  onClick,
}) {
  return (
    <button
      className={`nav-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */

function Dashboard({
  month,
  totals,
  onAdd,
  onPreviousMonth,
  onNextMonth,
}) {
  const negative =
    totals.availableNow < 0;

  return (
    <div className="page">

      <MonthSelector
        label={month.label}
        onPrevious={
          onPreviousMonth
        }
        onNext={onNextMonth}
      />

      <section className="hero-card">

        <div>

          <span>
            Disponible maintenant
          </span>

          <strong>
            {formatMoney(
              totals.availableNow
            )}
          </strong>

          <small>
            Après charges fixes :
            {" "}
            <b>
              {formatMoney(
                totals.availableAfterFixed
              )}
            </b>
          </small>

        </div>

        <div className="hero-icon">
          <WalletCards size={30} />
        </div>

      </section>

      <section className="stats-grid">

        <StatCard
          title="Revenus encaissés"
          value={
            totals.incomeActual
          }
          planned={
            totals.incomePlanned
          }
          remaining={
            totals.incomeRemaining
          }
          icon={
            <ArrowUp size={18} />
          }
          positive
        />

        <StatCard
          title="Dépenses réelles"
          value={
            totals.actualExpenses
          }
          planned={
            totals.plannedExpenses
          }
          icon={
            <ArrowDown size={18} />
          }
        />

        <StatCard
          title="Épargne"
          value={
            totals.savings
          }
          planned={
            totals.savingsBudget
          }
          icon={
            <PiggyBank size={18} />
          }
          positive
        />

      </section>

      <SectionTitle
        title="Revenus"
      />

      <div className="simple-list">

        {totals.incomeDetails.map(
          (income) => (
            <div
              className="simple-row"
              key={income.id}
            >

              <div>

                <strong>
                  {income.label}
                </strong>

                <small>
                  {income.type ===
                  "benefit"
                    ? "Avantage / crédit"
                    : "Revenu monétaire"}
                </small>

              </div>

              <div>

                <strong>
                  {formatMoney(
                    income.received
                  )}
                </strong>

                <small>

                  {income.remaining >
                  0
                    ? `Reste ${formatMoney(
                        income.remaining
                      )}`
                    : income.overrun >
                      0
                    ? `+${formatMoney(
                        income.overrun
                      )}`
                    : "Encaissé"}

                </small>

              </div>

            </div>
          )
        )}

      </div>

      <div className="fixed-summary-card">

        <div className="fixed-summary-header">

          <div>
            <span>
              Revenus prévus
            </span>
            <strong>
              {formatMoney(
                totals.incomePlanned
              )}
            </strong>
          </div>

          <div>
            <span>
              Encaissés
            </span>
            <strong>
              {formatMoney(
                totals.incomeActual
              )}
            </strong>
          </div>

          <div>
            <span>
              Reste à recevoir
            </span>
            <strong>
              {formatMoney(
                totals.incomeRemaining
              )}
            </strong>
          </div>

        </div>

        <div className="progress">

          <div
            className="progress-bar normal"
            style={{
              width: `${
                totals.incomePlanned ===
                0
                  ? 0
                  : Math.min(
                      (totals.incomeActual /
                        totals.incomePlanned) *
                        100,
                      100
                    )
              }%`,
            }}
          />

        </div>

      </div>

      <SectionTitle
        title="Charges fixes"
      />

      <div className="simple-list">

        {totals.fixedDetails.map(
          (expense) => (
            <div
              className="simple-row"
              key={expense.id}
            >

              <div>

                <strong>
                  {expense.label}
                </strong>

                <small>
                  Prévu :{" "}
                  {formatMoney(
                    expense.planned
                  )}
                </small>

              </div>

              <div>

                <strong
                  className={
                    expense.overrun >
                    0
                      ? "danger-text"
                      : expense.remaining >
                        0
                      ? "warning-text"
                      : ""
                  }
                >
                  {expense.overrun >
                  0
                    ? `Dépassement ${formatMoney(
                        expense.overrun
                      )}`
                    : expense.remaining >
                      0
                    ? `Reste ${formatMoney(
                        expense.remaining
                      )}`
                    : "Payé"}
                </strong>

                <small>
                  Payé :{" "}
                  {formatMoney(
                    expense.paid
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

      <div className="envelope-list">

        {totals.envelopeDetails.map(
          (envelope) => (
            <EnvelopeCard
              key={envelope.id}
              envelope={envelope}
            />
          )
        )}

      </div>

      {negative ? (
        <div className="alert-card">

          <AlertTriangle size={21} />

          <div>

            <strong>
              Situation déficitaire
            </strong>

            <p>
              Les dépenses dépassent les
              revenus monétaires encaissés.
            </p>

          </div>

        </div>
      ) : (
        <div className="empty-card">

          <CheckCircle2 size={20} />

          <span>
            Situation maîtrisée.
          </span>

        </div>
      )}

      <button
        className="primary-button full"
        onClick={onAdd}
        type="button"
      >
        <Plus size={19} />
        Ajouter une transaction
      </button>

    </div>
  );
}

/* ============================================================
   MOIS
============================================================ */

function MonthSelector({
  label,
  onPrevious,
  onNext,
}) {
  return (
    <div className="month-selector">

      <button
        onClick={onPrevious}
        type="button"
      >
        <ChevronLeft size={20} />
      </button>

      <strong>
        {label}
      </strong>

      <button
        onClick={onNext}
        type="button"
      >
        <ChevronRight size={20} />
      </button>

    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  planned,
  remaining,
  icon,
  positive,
}) {
  return (
    <div className="stat-card">

      <div className="stat-header">

        <span>
          {title}
        </span>

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

      {planned !==
        undefined && (
        <small>
          Prévu :{" "}
          {formatMoney(planned)}
        </small>
      )}

      {remaining !==
        undefined && (
        <small>
          Reste :{" "}
          {formatMoney(remaining)}
        </small>
      )}

    </div>
  );
}

/* ============================================================
   ENVELOPPE
============================================================ */

function EnvelopeCard({
  envelope,
}) {
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
          {formatMoney(
            envelope.spent
          )}
          {" / "}
          {formatMoney(
            envelope.budget
          )}
        </span>

      </div>

      <div className="progress">

        <div
          className={`progress-bar ${status}`}
          style={{
            width: `${Math.min(
              Math.max(
                percentage,
                0
              ),
              100
            )}%`,
          }}
        />

      </div>

      <div className="envelope-bottom">

        <span>
          {percentage.toFixed(0)} %
        </span>

        <span>
          {envelope.overrun >
          0
            ? `Dépassement ${formatMoney(
                envelope.overrun
              )}`
            : `Reste ${formatMoney(
                envelope.remaining
              )}`}
        </span>

      </div>

    </div>
  );
}

/* ============================================================
   BUDGET
============================================================ */

function Budget({
  totals,
}) {
  return (
    <div className="page">

      <PageTitle
        title="Budget"
        subtitle="Prévu contre réel"
      />

      <section className="summary-card">

        <div>
          <span>
            Revenus prévus
          </span>

          <strong>
            {formatMoney(
              totals.incomePlanned
            )}
          </strong>
        </div>

        <div>
          <span>
            Encaissés
          </span>

          <strong>
            {formatMoney(
              totals.incomeActual
            )}
          </strong>
        </div>

        <div>
          <span>
            À recevoir
          </span>

          <strong>
            {formatMoney(
              totals.incomeRemaining
            )}
          </strong>
        </div>

      </section>

      <SectionTitle
        title="Revenus"
      />

      <div className="simple-list">

        {totals.incomeDetails.map(
          (income) => (
            <div
              className="simple-row"
              key={income.id}
            >

              <div>

                <strong>
                  {income.label}
                </strong>

                <small>
                  Prévu :{" "}
                  {formatMoney(
                    income.planned
                  )}
                </small>

              </div>

              <div>

                <strong>
                  {formatMoney(
                    income.received
                  )}
                </strong>

                <small>
                  Reste :{" "}
                  {formatMoney(
                    income.remaining
                  )}
                </small>

              </div>

            </div>
          )
        )}

      </div>

      <SectionTitle
        title="Charges fixes"
      />

      <div className="simple-list">

        {totals.fixedDetails.map(
          (expense) => (
            <div
              className="simple-row"
              key={expense.id}
            >

              <div>

                <strong>
                  {expense.label}
                </strong>

                <small>
                  Prévu :{" "}
                  {formatMoney(
                    expense.planned
                  )}
                </small>

              </div>

              <div>

                <strong>
                  {formatMoney(
                    expense.paid
                  )}
                </strong>

                <small>
                  Reste :{" "}
                  {formatMoney(
                    expense.remaining
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

/* ============================================================
   TRANSACTIONS
============================================================ */

function Transactions({
  transactions,
}) {
  return (
    <div className="page">

      <PageTitle
        title="Transactions"
        subtitle="Vos mouvements"
      />

      {transactions.length ===
      0 ? (
        <div className="empty-card">
          <Receipt size={20} />
          <span>
            Aucune transaction.
          </span>
        </div>
      ) : (
        <div className="transaction-list">

          {[...transactions]
            .reverse()
            .map(
              (transaction) => (
                <div
                  className="transaction-card"
                  key={
                    transaction.id
                  }
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
                      {
                        transaction.payment
                      }
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
              )
            )}

        </div>
      )}

    </div>
  );
}

/* ============================================================
   OBJECTIFS
============================================================ */

function Goals({
  goals,
}) {
  return (
    <div className="page">

      <PageTitle
        title="Objectifs"
        subtitle="Construire les projets futurs"
      />

      <div className="goal-list">

        {goals.map(
          (goal) => {

            const target =
              toNumber(
                goal.target
              );

            const current =
              toNumber(
                goal.current
              );

            const percentage =
              target === 0
                ? 0
                : (current /
                    target) *
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
                        target
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
                      )}%`,
                    }}
                  />

                </div>

                <div className="goal-values">

                  <strong>
                    {formatMoney(
                      current
                    )}
                  </strong>

                  <span>
                    {percentage.toFixed(
                      0
                    )} %
                  </span>

                </div>

                <div className="goal-footer">

                  <span>
                    Reste{" "}
                    {formatMoney(
                      target -
                        current
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
          }
        )}

      </div>

    </div>
  );
}

/* ============================================================
   ANALYSE
============================================================ */

function Analysis({
  totals,
}) {
  return (
    <div className="page">

      <PageTitle
        title="Analyse"
        subtitle="Comprendre votre mois"
      />

      <section className="analysis-card">

        <h3>
          Revenus
        </h3>

        <div className="analysis-row">

          <span>
            Revenus prévus
          </span>

          <strong>
            {formatMoney(
              totals.incomePlanned
            )}
          </strong>

        </div>

        <div className="analysis-row">

          <span>
            Revenus encaissés
          </span>

          <strong>
            {formatMoney(
              totals.incomeActual
            )}
          </strong>

        </div>

        <div className="analysis-row">

          <span>
            Reste à recevoir
          </span>

          <strong>
            {formatMoney(
              totals.incomeRemaining
            )}
          </strong>

        </div>

        <div className="analysis-row">

          <span>
            Avantages / crédits prévus
          </span>

          <strong>
            {formatMoney(
              totals.benefitPlanned
            )}
          </strong>

        </div>

        <div className="analysis-row">

          <span>
            Avantages / crédits reçus
          </span>

          <strong>
            {formatMoney(
              totals.benefitReceived
            )}
          </strong>

        </div>

      </section>

      <section className="analysis-card">

        <h3>
          Situation bancaire
        </h3>

        <div className="analysis-row">

          <span>
            Revenus monétaires encaissés
          </span>

          <strong>
            {formatMoney(
              totals.incomeActual
            )}
          </strong>

        </div>

        <div className="analysis-row">

          <span>
            Dépenses réelles
          </span>

          <strong>
            {formatMoney(
              totals.actualExpenses
            )}
          </strong>

        </div>

        <div className="analysis-row total">

          <span>
            Disponible
          </span>

          <strong>
            {formatMoney(
              totals.availableNow
            )}
          </strong>

        </div>

      </section>

    </div>
  );
}

/* ============================================================
   PAGE TITLE
============================================================ */

function PageTitle({
  title,
  subtitle,
}) {
  return (
    <div className="page-title">

      <h2>
        {title}
      </h2>

      <p>
        {subtitle}
      </p>

    </div>
  );
}

/* ============================================================
   SECTION TITLE
============================================================ */

function SectionTitle({
  title,
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
    </div>
  );
}

/* ============================================================
   MODALE TRANSACTION
============================================================ */

function AddTransactionModal({
  onClose,
  onSave,
  envelopes,
  fixedExpenses,
  incomes,
}) {
  const [
    type,
    setType,
  ] = useState("expense");

  const [
    form,
    setForm,
  ] = useState({
    label: "",
    amount: "",
    category:
      envelopes[0]?.name ||
      "Courses",
    fixedExpenseId:
      fixedExpenses[0]?.id ||
      "",
    incomeId:
      incomes.find(
        (item) =>
          item.type !==
          "benefit"
      )?.id ||
      incomes[0]?.id ||
      "",
    payment:
      "Carte bancaire",
    date:
      new Date()
        .toISOString()
        .split("T")[0],
  });

  const isFixed =
    form.category ===
    "Charges fixes";

  const selectedIncome =
    incomes.find(
      (income) =>
        income.id ===
        form.incomeId
    );

  const submit = (
    event
  ) => {
    event.preventDefault();

    const amount =
      toNumber(
        form.amount
      );

    if (amount <= 0) {
      return;
    }

    /* --------------------------------------------------------
       REVENU
    -------------------------------------------------------- */

    if (type === "income") {

      const income =
        incomes.find(
          (item) =>
            item.id ===
            form.incomeId
        );

      if (!income) {
        return;
      }

      onSave({
        type: "income",
        label:
          income.label,
        amount,
        incomeId:
          income.id,
        category:
          income.type ===
          "benefit"
            ? "Avantage"
            : "Revenu",
        payment:
          form.payment,
        date:
          form.date,
      });

      return;
    }

    /* --------------------------------------------------------
       DÉPENSE
    -------------------------------------------------------- */

    if (isFixed) {

      const fixed =
        fixedExpenses.find(
          (item) =>
            item.id ===
            form.fixedExpenseId
        );

      if (!fixed) {
        return;
      }

      onSave({
        type: "expense",
        label:
          fixed.label,
        amount,
        category:
          "Charges fixes",
        fixedExpenseId:
          fixed.id,
        payment:
          form.payment,
        date:
          form.date,
      });

      return;
    }

    if (!form.label.trim()) {
      return;
    }

    onSave({
      type: "expense",
      label:
        form.label.trim(),
      amount,
      category:
        form.category,
      fixedExpenseId:
        null,
      payment:
        form.payment,
      date:
        form.date,
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
              Nouvelle transaction
            </h2>

            <span>
              Dépense ou encaissement
            </span>

          </div>

          <button
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={21} />
          </button>

        </div>

        <form
          onSubmit={submit}
        >

          <label>

            Type

            <select
              value={type}
              onChange={(event) =>
                setType(
                  event.target.value
                )
              }
            >

              <option value="expense">
                Dépense
              </option>

              <option value="income">
                Revenu encaissé
              </option>

            </select>

          </label>

          {type ===
          "income" ? (
            <>
              <label>

                Revenu

                <select
                  value={
                    form.incomeId
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      incomeId:
                        event.target
                          .value,
                    })
                  }
                >

                  {incomes.map(
                    (income) => (
                      <option
                        key={
                          income.id
                        }
                        value={
                          income.id
                        }
                      >
                        {income.label}
                        {income.type ===
                        "benefit"
                          ? " — avantage / crédit"
                          : ""}
                      </option>
                    )
                  )}

                </select>

              </label>

              <label>

                Montant encaissé

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.amount
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      amount:
                        event.target
                          .value,
                    })
                  }
                  placeholder="0,00"
                  autoFocus
                />

              </label>

              {selectedIncome && (
                <div className="modal-info">

                  <strong>
                    Prévu :
                    {" "}
                    {formatMoney(
                      selectedIncome.planned
                    )}
                  </strong>

                  <span>
                    Le montant encaissé sera
                    enregistré comme une
                    transaction.
                  </span>

                </div>
              )}

            </>
          ) : (
            <>
              <label>

                Libellé

                <input
                  value={
                    form.label
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      label:
                        event.target
                          .value,
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
                  min="0"
                  step="0.01"
                  value={
                    form.amount
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      amount:
                        event.target
                          .value,
                    })
                  }
                  placeholder="0,00"
                />

              </label>

              <label>

                Catégorie

                <select
                  value={
                    form.category
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      category:
                        event.target
                          .value,
                    })
                  }
                >

                  {envelopes
                    .filter(
                      (item) =>
                        item.name !==
                        "Épargne"
                    )
                    .map(
                      (
                        envelope
                      ) => (
                        <option
                          key={
                            envelope.id
                          }
                          value={
                            envelope.name
                          }
                        >
                          {
                            envelope.name
                          }
                        </option>
                      )
                    )}

                  <option value="Charges fixes">
                    Charges fixes
                  </option>

                </select>

              </label>

              {isFixed && (
                <label>

                  Charge fixe

                  <select
                    value={
                      form.fixedExpenseId
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        fixedExpenseId:
                          event.target
                            .value,
                      })
                    }
                  >

                    {fixedExpenses.map(
                      (
                        expense
                      ) => (
                        <option
                          key={
                            expense.id
                          }
                          value={
                            expense.id
                          }
                        >
                          {
                            expense.label
                          }
                        </option>
                      )
                    )}

                  </select>

                </label>
              )}

            </>
          )}

          <label>

            Moyen de paiement

            <select
              value={
                form.payment
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,
                  payment:
                    event.target
                      .value,
                })
              }
            >

              <option>
                Carte bancaire
              </option>

              <option>
                Prélèvement
              </option>

              <option>
                Virement
              </option>

              <option>
                Espèces
              </option>

              <option>
                Carte restaurant
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
              value={
                form.date
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,
                  date:
                    event.target
                      .value,
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
