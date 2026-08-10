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

/* ============================================================
   CONFIGURATION
============================================================ */

const DATA_VERSION = 2;
const STORAGE_KEY = "mon-budget-data-v2";

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
   CHARGEMENT DES DONNÉES

   IMPORTANT :
   L'ancien stockage est volontairement ignoré.
   La V2 du stockage utilise les transactions comme
   source de vérité pour les dépenses réelles.
============================================================ */

function loadData() {
  try {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) {
      return {
        ...initialData,
        dataVersion:
          DATA_VERSION,
      };
    }

    const parsed =
      JSON.parse(saved);

    if (
      parsed?.dataVersion !==
      DATA_VERSION
    ) {
      return {
        ...initialData,
        dataVersion:
          DATA_VERSION,
      };
    }

    return parsed;
  } catch (error) {
    console.error(
      "Impossible de charger les données.",
      error
    );

    return {
      ...initialData,
      dataVersion:
        DATA_VERSION,
    };
  }
}

/* ============================================================
   MOIS
============================================================ */

function shiftMonth(
  monthKey,
  amount
) {
  const [year, month] =
    monthKey
      .split("-")
      .map(Number);

  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabel(
  monthKey
) {
  const [year, month] =
    monthKey
      .split("-")
      .map(Number);

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      year,
      month - 1,
      1
    )
  );
}

/* ============================================================
   CRÉATION D'UN NOUVEAU MOIS
============================================================ */

function createMonthFromTemplate(
  sourceMonth,
  monthKey
) {
  return {
    label:
      getMonthLabel(
        monthKey
      ),

    income:
      sourceMonth.income.map(
        (item) => ({
          ...item,
          actual: 0,
        })
      ),

    fixedExpenses:
      sourceMonth.fixedExpenses.map(
        (item) => ({
          ...item,

          /*
           * actual n'est plus utilisé
           * comme source de vérité.
           *
           * Il est conservé uniquement
           * pour compatibilité avec
           * l'ancien modèle.
           */
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

    goals:
      sourceMonth.goals.map(
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
  if (
    budgetData.months[
      monthKey
    ]
  ) {
    return budgetData;
  }

  const existingKeys =
    Object.keys(
      budgetData.months
    ).sort();

  const templateKey =
    existingKeys.find(
      (key) =>
        key <= monthKey
    ) ||
    existingKeys[0];

  const template =
    budgetData.months[
      templateKey
    ];

  return {
    ...budgetData,

    months: {
      ...budgetData.months,

      [monthKey]:
        createMonthFromTemplate(
          template,
          monthKey
        ),
    },
  };
}

/* ============================================================
   CALCUL DU PAYÉ PAR CHARGE FIXE

   SOURCE DE VÉRITÉ :
   les transactions.

   On ne lit PLUS fixedExpense.actual.
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
        transaction.category ===
          "Charges fixes" &&
        transaction.fixedExpenseId ===
          fixedExpenseId
    )
    .reduce(
      (sum, transaction) =>
        sum +
        toNumber(
          transaction.amount
        ),
      0
    );
}

/* ============================================================
   CALCUL D'UNE ENVELOPPE

   SOURCE DE VÉRITÉ :
   les transactions.
============================================================ */

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
        toNumber(
          transaction.amount
        ),
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
  ] = useState(
    "dashboard"
  );

  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);

  const currentMonth =
    data.months[
      data.currentMonth
    ];

  /* ==========================================================
     SAUVEGARDE
  ========================================================== */

  const saveData = (
    newData
  ) => {
    const finalData = {
      ...newData,
      dataVersion:
        DATA_VERSION,
    };

    setData(finalData);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        finalData
      )
    );
  };

  /* ==========================================================
     NAVIGATION MOIS
  ========================================================== */

  const changeMonth = (
    direction
  ) => {
    const newMonthKey =
      shiftMonth(
        data.currentMonth,
        direction
      );

    const preparedData =
      ensureMonthExists(
        data,
        newMonthKey
      );

    saveData({
      ...preparedData,
      currentMonth:
        newMonthKey,
    });
  };

  /* ==========================================================
     CALCULS FINANCIERS
  ========================================================== */

  const totals = useMemo(() => {
    /* --------------------------------------------------------
       REVENUS
    -------------------------------------------------------- */

    const incomePlanned =
      currentMonth.income.reduce(
        (sum, item) =>
          sum +
          toNumber(
            item.planned
          ),
        0
      );

    const incomeActual =
      currentMonth.income.reduce(
        (sum, item) =>
          sum +
          toNumber(
            item.actual
          ),
        0
      );

    const incomeDifference =
      incomeActual -
      incomePlanned;

    /* --------------------------------------------------------
       CHARGES FIXES

       IMPORTANT :
       actual = somme des transactions
       et NON plus fixedExpense.actual
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
          sum +
          expense.planned,
        0
      );

    const fixedActual =
      fixedDetails.reduce(
        (sum, expense) =>
          sum +
          expense.paid,
        0
      );

    const fixedRemaining =
      fixedDetails.reduce(
        (sum, expense) =>
          sum +
          expense.remaining,
        0
      );

    const fixedOverrun =
      fixedDetails.reduce(
        (sum, expense) =>
          sum +
          expense.overrun,
        0
      );

    /* --------------------------------------------------------
       ENVELOPPES

       Le budget reste fixe.
       Le dépensé vient des transactions.
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
          sum +
          envelope.budget,
        0
      );

    const envelopeSpent =
      envelopeDetails.reduce(
        (sum, envelope) =>
          sum +
          envelope.spent,
        0
      );

    const envelopeRemaining =
      envelopeDetails.reduce(
        (sum, envelope) =>
          sum +
          envelope.remaining,
        0
      );

    const overBudget =
      envelopeDetails.reduce(
        (sum, envelope) =>
          sum +
          envelope.overrun,
        0
      );

    /* --------------------------------------------------------
       ÉPARGNE
    -------------------------------------------------------- */

    const savingsDetails =
      envelopeDetails.filter(
        (item) =>
          item.name ===
          "Épargne"
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

    /* --------------------------------------------------------
       ENVELOPPES VARIABLES
    -------------------------------------------------------- */

    const variableDetails =
      envelopeDetails.filter(
        (item) =>
          item.name !==
          "Épargne"
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
       DÉPENSES
    -------------------------------------------------------- */

    const actualExpenses =
      fixedActual +
      variableSpent;

    const plannedExpenses =
      fixedPlanned +
      variableBudget;

    /* --------------------------------------------------------
       DISPONIBLE
    -------------------------------------------------------- */

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
      incomePlanned,
      incomeActual,
      incomeDifference,

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

     IMPORTANT :
     aucune modification de fixedExpenses.actual
     aucune modification de envelope.spent

     La transaction est la seule écriture.
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
          title="Paramètres"
          type="button"
        >
          <Settings
            size={20}
          />
        </button>

      </header>

      <main className="main">

        {activePage ===
          "dashboard" && (
          <Dashboard
            month={
              currentMonth
            }
            totals={
              totals
            }
            onAdd={() =>
              setShowAddModal(
                true
              )
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
            month={
              currentMonth
            }
            totals={
              totals
            }
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
            goals={
              currentMonth.goals
            }
          />
        )}

        {activePage ===
          "analysis" && (
          <Analysis
            month={
              currentMonth
            }
            totals={
              totals
            }
          />
        )}

      </main>

      <button
        className="floating-button"
        onClick={() =>
          setShowAddModal(
            true
          )
        }
        aria-label="Ajouter"
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
            <LayoutDashboard
              size={21}
            />
          }
          label="Accueil"
          onClick={() =>
            setActivePage(
              "dashboard"
            )
          }
        />

        <NavButton
          active={
            activePage ===
            "budget"
          }
          icon={
            <WalletCards
              size={21}
            />
          }
          label="Budget"
          onClick={() =>
            setActivePage(
              "budget"
            )
          }
        />

        <div className="nav-spacer" />

        <NavButton
          active={
            activePage ===
            "transactions"
          }
          icon={
            <Receipt
              size={21}
            />
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
            <Target
              size={21}
            />
          }
          label="Objectifs"
          onClick={() =>
            setActivePage(
              "goals"
            )
          }
        />

      </nav>

      {showAddModal && (
        <AddTransactionModal
          onClose={() =>
            setShowAddModal(
              false
            )
          }
          onSave={
            addTransaction
          }
          envelopes={
            currentMonth.envelopes
          }
          fixedExpenses={
            currentMonth.fixedExpenses
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
        active
          ? "active"
          : ""
      }`}
      onClick={
        onClick
      }
      type="button"
    >
      {icon}

      <span>
        {label}
      </span>
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
    totals.availableNow <
    0;

  const forecastNegative =
    totals.forecastEnd <
    0;

  return (
    <div className="page">

      <MonthSelector
        label={
          month.label
        }
        onPrevious={
          onPreviousMonth
        }
        onNext={
          onNextMonth
        }
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
            Après paiement des charges
            encore dues :{" "}
            <b>
              {formatMoney(
                totals.availableAfterFixed
              )}
            </b>
          </small>

        </div>

        <div className="hero-icon">
          <WalletCards
            size={30}
          />
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
          difference={
            totals.incomeDifference
          }
          icon={
            <ArrowUp
              size={18}
            />
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
            <ArrowDown
              size={18}
            />
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
            <PiggyBank
              size={18}
            />
          }
          positive
        />

      </section>

      <SectionTitle
        title="Revenus"
      />

      <div className="simple-list">

        {month.income.map(
          (income) => (
            <div
              className="simple-row"
              key={
                income.id
              }
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
                    income.actual
                  )}
                </strong>

                <small>
                  Réel
                </small>

              </div>

            </div>
          )
        )}

      </div>

      <SectionTitle
        title="Charges fixes"
      />

      <section className="fixed-summary-card">

        <div className="fixed-summary-header">

          <div>
            <span>
              Prévu
            </span>

            <strong>
              {formatMoney(
                totals.fixedPlanned
              )}
            </strong>
          </div>

          <div>
            <span>
              Payé
            </span>

            <strong>
              {formatMoney(
                totals.fixedActual
              )}
            </strong>
          </div>

          <div>
            <span>
              Reste à payer
            </span>

            <strong>
              {formatMoney(
                totals.fixedRemaining
              )}
            </strong>
          </div>

        </div>

        <div className="progress">

          <div
            className="progress-bar normal"
            style={{
              width: `${
                totals.fixedPlanned ===
                0
                  ? 0
                  : Math.min(
                      (
                        totals.fixedActual /
                        totals.fixedPlanned
                      ) *
                        100,
                      100
                    )
              }%`,
            }}
          />

        </div>

        <div className="fixed-summary-footer">

          <span>
            Après paiement des charges fixes
          </span>

          <strong>
            {formatMoney(
              totals.availableAfterFixed
            )}
          </strong>

        </div>

      </section>

      <div className="simple-list">

        {totals.fixedDetails.map(
          (expense) => (
            <div
              className="simple-row"
              key={
                expense.id
              }
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
              key={
                envelope.id
              }
              envelope={
                envelope
              }
            />
          )
        )}

      </div>

      <SectionTitle
        title="État du mois"
      />

      {negative ? (
        <div className="alert-card">

          <AlertTriangle
            size={21}
          />

          <div>

            <strong>
              Situation déficitaire
            </strong>

            <p>
              Les dépenses déjà enregistrées
              dépassent les revenus encaissés.
            </p>

          </div>

        </div>
      ) : forecastNegative ? (
        <div className="alert-card">

          <AlertTriangle
            size={21}
          />

          <div>

            <strong>
              Fin de mois sous tension
            </strong>

            <p>
              Le budget devient négatif
              si les budgets restants sont
              entièrement consommés.
            </p>

          </div>

        </div>
      ) : totals.fixedOverrun >
        0 ? (
        <div className="alert-card">

          <AlertTriangle
            size={21}
          />

          <div>

            <strong>
              Une charge fixe dépasse
              son montant prévu
            </strong>

            <p>
              Dépassement total :{" "}
              {formatMoney(
                totals.fixedOverrun
              )}
            </p>

          </div>

        </div>
      ) : totals.overBudget >
        0 ? (
        <div className="alert-card">

          <AlertTriangle
            size={21}
          />

          <div>

            <strong>
              Des enveloppes sont dépassées
            </strong>

            <p>
              Dépassement total :{" "}
              {formatMoney(
                totals.overBudget
              )}
            </p>

          </div>

        </div>
      ) : (
        <div className="empty-card">

          <CheckCircle2
            size={20}
          />

          <span>
            Situation maîtrisée.
          </span>

        </div>
      )}

      <button
        className="primary-button full"
        onClick={
          onAdd
        }
        type="button"
      >

        <Plus
          size={19}
        />

        Ajouter une dépense

      </button>

    </div>
  );
}

/* ============================================================
   SÉLECTEUR DE MOIS
============================================================ */

function MonthSelector({
  label,
  onPrevious,
  onNext,
}) {
  return (
    <div className="month-selector">

      <button
        onClick={
          onPrevious
        }
        type="button"
        aria-label="Mois précédent"
      >
        <ChevronLeft
          size={20}
        />
      </button>

      <strong>
        {label}
      </strong>

      <button
        onClick={
          onNext
        }
        type="button"
        aria-label="Mois suivant"
      >
        <ChevronRight
          size={20}
        />
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
  difference,
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
        {formatMoney(
          value
        )}
      </strong>

      {planned !==
        undefined && (
        <small>
          Prévu :{" "}
          {formatMoney(
            planned
          )}
        </small>
      )}

      {difference !==
        undefined &&
        difference !==
          0 && (
        <small
          className={
            difference <
            0
              ? "warning-text"
              : "positive-text"
          }
        >
          Écart :{" "}
          {difference >
          0
            ? "+"
            : ""}
          {formatMoney(
            difference
          )}
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
  const budget =
    toNumber(
      envelope.budget
    );

  const spent =
    toNumber(
      envelope.spent
    );

  const percentage =
    budget === 0
      ? 0
      : (spent / budget) *
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
            spent
          )}
          {" / "}
          {formatMoney(
            budget
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
          {percentage.toFixed(
            0
          )} %
        </span>

        <span
          className={
            envelope.overrun >
            0
              ? "danger-text"
              : ""
          }
        >
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
   SECTION TITLE
============================================================ */

function SectionTitle({
  title,
}) {
  return (
    <div className="section-title">

      <h2>
        {title}
      </h2>

    </div>
  );
}

/* ============================================================
   BUDGET
============================================================ */

function Budget({
  month,
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
            Revenus réels
          </span>

          <strong>
            {formatMoney(
              totals.incomeActual
            )}
          </strong>
        </div>

        <div>
          <span>
            Charges restantes
          </span>

          <strong>
            {formatMoney(
              totals.fixedRemaining
            )}
          </strong>
        </div>

      </section>

      <SectionTitle
        title="Charges fixes"
      />

      <div className="simple-list">

        {totals.fixedDetails.map(
          (expense) => (
            <div
              className="simple-row"
              key={
                expense.id
              }
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

      <SectionTitle
        title="Enveloppes"
      />

      <div className="simple-list">

        {totals.envelopeDetails.map(
          (envelope) => (
            <div
              className="simple-row"
              key={
                envelope.id
              }
            >

              <div>

                <strong>
                  {envelope.name}
                </strong>

                <small>
                  Budget :{" "}
                  {formatMoney(
                    envelope.budget
                  )}
                </small>

              </div>

              <div>

                <strong>
                  {formatMoney(
                    envelope.spent
                  )}
                </strong>

                <small>
                  Reste :{" "}
                  {formatMoney(
                    envelope.remaining
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

          <Receipt
            size={20}
          />

          <span>
            Aucune transaction
            enregistrée pour ce mois.
          </span>

        </div>
      ) : (
        <div className="transaction-list">

          {[
            ...transactions,
          ]
            .reverse()
            .map(
              (
                transaction
              ) => (
                <div
                  className="transaction-card"
                  key={
                    transaction.id
                  }
                >

                  <div className="transaction-icon">

                    {transaction.type ===
                    "expense" ? (
                      <ArrowDown
                        size={18}
                      />
                    ) : (
                      <ArrowUp
                        size={18}
                      />
                    )}

                  </div>

                  <div className="transaction-info">

                    <strong>
                      {
                        transaction.label
                      }
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
                key={
                  goal.id
                }
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

                  <Target
                    size={22}
                  />

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
  month,
  totals,
}) {
  const monitored =
    totals.envelopeDetails.filter(
      (item) =>
        item.budget > 0 &&
        item.spent /
            item.budget >=
          0.8
    );

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
          {totals.expenseRate.toFixed(
            1
          )} %
        </strong>

        <p>
          Part des revenus réellement
          encaissés déjà consommée.
        </p>

      </section>

      <section className="analysis-card">

        <h3>
          Situation
        </h3>

        <div className="analysis-row">

          <span>
            Revenus
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

        <div className="analysis-row">

          <span>
            Épargne
          </span>

          <strong>
            {formatMoney(
              totals.savings
            )}
          </strong>

        </div>

        <div className="analysis-row">

          <span>
            Charges restantes
          </span>

          <strong>
            {formatMoney(
              totals.fixedRemaining
            )}
          </strong>

        </div>

        <div className="analysis-row total">

          <span>
            Disponible après charges fixes
          </span>

          <strong>
            {formatMoney(
              totals.availableAfterFixed
            )}
          </strong>

        </div>

      </section>

      <section className="analysis-card">

        <h3>
          Enveloppes à surveiller
        </h3>

        {monitored.length ===
        0 ? (
          <div className="empty-card">

            <CheckCircle2
              size={20}
            />

            <span>
              Aucune enveloppe à surveiller.
            </span>

          </div>
        ) : (
          monitored.map(
            (item) => (
              <div
                className="analysis-row"
                key={
                  item.id
                }
              >

                <span>
                  {item.name}
                </span>

                <strong>
                  {(
                    (item.spent /
                      item.budget) *
                    100
                  ).toFixed(
                    0
                  )}
                  %
                </strong>

              </div>
            )
          )
        )}

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
   MODALE AJOUT TRANSACTION
============================================================ */

function AddTransactionModal({
  onClose,
  onSave,
  envelopes,
  fixedExpenses,
}) {
  const variableEnvelopes =
    envelopes.filter(
      (item) =>
        item.name !==
        "Épargne"
    );

  const [
    form,
    setForm,
  ] = useState({
    label: "",
    amount: "",
    category:
      variableEnvelopes[0]
        ?.name ||
      "Courses",
    fixedExpenseId:
      fixedExpenses[0]
        ?.id ||
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

    if (
      isFixed &&
      !form.fixedExpenseId
    ) {
      return;
    }

    const fixedExpense =
      fixedExpenses.find(
        (item) =>
          item.id ===
          form.fixedExpenseId
      );

    const label =
      isFixed
        ? fixedExpense?.label ||
          "Charge fixe"
        : form.label.trim();

    if (!label) {
      return;
    }

    onSave({
      type: "expense",
      label,
      amount,
      category:
        form.category,
      fixedExpenseId:
        isFixed
          ? form.fixedExpenseId
          : null,
      payment:
        form.payment,
      date:
        form.date,
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={
        onClose
      }
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
              Enregistrer une transaction
            </span>

          </div>

          <button
            className="icon-button"
            onClick={
              onClose
            }
            type="button"
          >
            <X
              size={21}
            />
          </button>

        </div>

        <form
          onSubmit={
            submit
          }
        >

          {!isFixed && (
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
          )}

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

              {variableEnvelopes.map(
                (envelope) => (
                  <option
                    key={
                      envelope.id
                    }
                    value={
                      envelope.name
                    }
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
                  (expense) => (
                    <option
                      key={
                        expense.id
                      }
                      value={
                        expense.id
                      }
                    >
                      {expense.label}
                    </option>
                  )
                )}

              </select>

            </label>
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
