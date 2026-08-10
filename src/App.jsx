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

/* ============================================================
   CHARGEMENT DES DONNÉES
============================================================ */

function loadData() {
  try {
    const saved = localStorage.getItem("mon-budget-data");

    if (!saved) {
      return initialData;
    }

    const parsed = JSON.parse(saved);

    const currentMonthKey = parsed?.currentMonth;
    const currentMonth = parsed?.months?.[currentMonthKey];

    const isValid =
      parsed &&
      typeof parsed === "object" &&
      parsed.months &&
      typeof parsed.months === "object" &&
      currentMonthKey &&
      currentMonth &&
      Array.isArray(currentMonth.income) &&
      Array.isArray(currentMonth.fixedExpenses) &&
      Array.isArray(currentMonth.envelopes) &&
      Array.isArray(currentMonth.transactions) &&
      Array.isArray(currentMonth.goals);

    if (isValid) {
      return parsed;
    }

    localStorage.removeItem("mon-budget-data");
  } catch (error) {
    console.error(
      "Impossible de charger les données du budget.",
      error
    );

    localStorage.removeItem("mon-budget-data");
  }

  return initialData;
}

/* ============================================================
   GESTION DES MOIS
============================================================ */

function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey
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

function getMonthLabel(monthKey) {
  const [year, month] = monthKey
    .split("-")
    .map(Number);

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
        actual: 0,
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

  const existingKeys =
    Object.keys(
      budgetData.months
    ).sort();

  const templateKey =
    existingKeys.find(
      (key) => key <= monthKey
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
   APPLICATION
============================================================ */

function App() {
  const [data, setData] =
    useState(loadData);

  const [activePage, setActivePage] =
    useState("dashboard");

  const [showAddModal, setShowAddModal] =
    useState(false);

  const currentMonth =
    data.months[
      data.currentMonth
    ];

  /* ==========================================================
     SAUVEGARDE
  ========================================================== */

  const saveData = (newData) => {
    setData(newData);

    localStorage.setItem(
      "mon-budget-data",
      JSON.stringify(newData)
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
    /* ------------------------------
       REVENUS
    ------------------------------ */

    const incomePlanned =
      currentMonth.income.reduce(
        (sum, item) =>
          sum +
          Number(
            item.planned || 0
          ),
        0
      );

    const incomeActual =
      currentMonth.income.reduce(
        (sum, item) =>
          sum +
          Number(
            item.actual || 0
          ),
        0
      );

    const incomeDifference =
      incomeActual -
      incomePlanned;

    /* ------------------------------
       CHARGES FIXES
    ------------------------------ */

    const fixedPlanned =
      currentMonth.fixedExpenses.reduce(
        (sum, item) =>
          sum +
          Number(
            item.planned || 0
          ),
        0
      );

    const fixedActual =
      currentMonth.fixedExpenses.reduce(
        (sum, item) =>
          sum +
          Number(
            item.actual || 0
          ),
        0
      );

    const fixedRemaining =
      currentMonth.fixedExpenses.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(
              item.planned || 0
            ) -
              Number(
                item.actual || 0
              ),
            0
          ),
        0
      );

    const fixedDifference =
      fixedActual -
      fixedPlanned;

    /* ------------------------------
       ENVELOPPES
    ------------------------------ */

    const envelopeBudget =
      currentMonth.envelopes.reduce(
        (sum, item) =>
          sum +
          Number(
            item.budget || 0
          ),
        0
      );

    const envelopeSpent =
      currentMonth.envelopes.reduce(
        (sum, item) =>
          sum +
          Number(
            item.spent || 0
          ),
        0
      );

    const envelopeRemaining =
      currentMonth.envelopes.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(
              item.budget || 0
            ) -
              Number(
                item.spent || 0
              ),
            0
          ),
        0
      );

    const overBudget =
      currentMonth.envelopes.reduce(
        (sum, item) =>
          sum +
          Math.max(
            Number(
              item.spent || 0
            ) -
              Number(
                item.budget || 0
              ),
            0
          ),
        0
      );

    /* ------------------------------
       ÉPARGNE
    ------------------------------ */

    const savingsEnvelopes =
      currentMonth.envelopes.filter(
        (item) =>
          item.name ===
          "Épargne"
      );

    const savings =
      savingsEnvelopes.reduce(
        (sum, item) =>
          sum +
          Number(
            item.spent || 0
          ),
        0
      );

    const savingsBudget =
      savingsEnvelopes.reduce(
        (sum, item) =>
          sum +
          Number(
            item.budget || 0
          ),
        0
      );

    /* ------------------------------
       ENVELOPPES VARIABLES
    ------------------------------ */

    const variableEnvelopes =
      currentMonth.envelopes.filter(
        (item) =>
          item.name !==
          "Épargne"
      );

    const variableBudget =
      variableEnvelopes.reduce(
        (sum, item) =>
          sum +
          Number(
            item.budget || 0
          ),
        0
      );

    const variableSpent =
      variableEnvelopes.reduce(
        (sum, item) =>
          sum +
          Number(
            item.spent || 0
          ),
        0
      );

    /* ------------------------------
       SYNTHÈSE
    ------------------------------ */

    const actualExpenses =
      fixedActual +
      variableSpent;

    const plannedExpenses =
      fixedPlanned +
      variableBudget;

    /*
     * Argent réellement disponible
     * à l'instant présent.
     */
    const availableNow =
      incomeActual -
      fixedActual -
      envelopeSpent;

    /*
     * Argent restant après paiement
     * des charges fixes encore dues.
     */
    const availableAfterFixed =
      incomeActual -
      fixedRemaining -
      envelopeSpent;

    /*
     * Prévision après consommation
     * du budget restant.
     */
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

      fixedPlanned,
      fixedActual,
      fixedRemaining,
      fixedDifference,

      envelopeBudget,
      envelopeSpent,
      envelopeRemaining,

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

      overBudget,
      expenseRate,
    };
  }, [currentMonth]);

  /* ==========================================================
     AJOUT TRANSACTION
  ========================================================== */

  const addTransaction = (
    transaction
  ) => {
    const month =
      data.months[
        data.currentMonth
      ];

    const amount =
      Number(
        transaction.amount
      );

    const newTransaction = {
      ...transaction,
      id: `tx-${Date.now()}`,
      amount,
    };

    let updatedMonth = {
      ...month,

      transactions: [
        ...month.transactions,
        newTransaction,
      ],
    };

    /* ------------------------------
       DÉPENSE
    ------------------------------ */

    if (
      transaction.type ===
      "expense"
    ) {
      /*
       * CHARGE FIXE
       */
      if (
        transaction.category ===
        "Charges fixes"
      ) {
        updatedMonth.fixedExpenses =
          month.fixedExpenses.map(
            (expense) =>
              expense.id ===
              transaction.fixedExpenseId
                ? {
                    ...expense,

                    actual:
                      Number(
                        expense.actual ||
                          0
                      ) +
                      amount,
                  }
                : expense
          );
      } else {
        /*
         * ENVELOPPE VARIABLE
         */
        updatedMonth.envelopes =
          month.envelopes.map(
            (envelope) =>
              envelope.name ===
              transaction.category
                ? {
                    ...envelope,

                    spent:
                      Number(
                        envelope.spent ||
                          0
                      ) +
                      amount,
                  }
                : envelope
          );
      }
    }

    /* ------------------------------
       REVENU
    ------------------------------ */

    if (
      transaction.type ===
      "income"
    ) {
      updatedMonth.income = [
        ...month.income,

        {
          id:
            newTransaction.id,

          label:
            transaction.label,

          planned:
            amount,

          actual:
            amount,
        },
      ];
    }

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

      {/* HEADER */}

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
        >
          <Settings size={20} />
        </button>

      </header>

      {/* CONTENU */}

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

      {/* BOUTON AJOUT */}

      <button
        className="floating-button"
        onClick={() =>
          setShowAddModal(
            true
          )
        }
        aria-label="Ajouter"
      >
        <Plus size={25} />
      </button>

      {/* NAVIGATION */}

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

      {/* MODALE */}

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
  const alerts =
    month.envelopes.filter(
      (item) =>
        Number(
          item.budget || 0
        ) > 0 &&
        Number(
          item.spent || 0
        ) >=
          Number(
            item.budget || 0
          )
    );

  const hasNegativeAvailable =
    totals.availableNow <
    0;

  const forecastIsNegative =
    totals.forecastEnd <
    0;

  return (
    <div className="page">

      {/* MOIS */}

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

      {/* DISPONIBLE */}

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

      {/* STATS */}

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

      {/* REVENUS */}

      <SectionTitle
        title="Revenus"
      />

      <div className="simple-list">

        {month.income.map(
          (income) => {

            const difference =
              Number(
                income.actual || 0
              ) -
              Number(
                income.planned || 0
              );

            return (
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

                  <small
                    className={
                      difference <
                      0
                        ? "warning-text"
                        : ""
                    }
                  >
                    {difference ===
                    0
                      ? "Conforme"
                      : difference >
                        0
                      ? `+${formatMoney(
                          difference
                        )}`
                      : formatMoney(
                          difference
                        )}
                  </small>

                </div>

              </div>
            );
          }
        )}

      </div>

      {/* CHARGES FIXES */}

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

      {/* DETAIL CHARGES FIXES */}

      <div className="simple-list">

        {month.fixedExpenses.map(
          (expense) => {

            const planned =
              Number(
                expense.planned ||
                  0
              );

            const actual =
              Number(
                expense.actual ||
                  0
              );

            const remaining =
              Math.max(
                planned -
                  actual,
                0
              );

            const difference =
              actual -
              planned;

            return (

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
                      planned
                    )}
                  </small>

                </div>

                <div>

                  <strong
                    className={
                      difference >
                      0
                        ? "danger-text"
                        : remaining >
                          0
                        ? "warning-text"
                        : ""
                    }
                  >

                    {difference >
                    0
                      ? `+${formatMoney(
                          difference
                        )}`
                      : remaining >
                        0
                      ? `Reste ${formatMoney(
                          remaining
                        )}`
                      : "Payé"}

                  </strong>

                  <small>
                    Réel :{" "}
                    {formatMoney(
                      actual
                    )}
                  </small>

                </div>

              </div>

            );
          }
        )}

      </div>

      {/* ENVELOPPES */}

      <SectionTitle
        title="Enveloppes"
      />

      <div className="envelope-list">

        {month.envelopes.map(
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

      {/* ÉTAT */}

      <SectionTitle
        title="État du mois"
      />

      {hasNegativeAvailable ? (

        <div className="alert-card">

          <AlertTriangle
            size={21}
          />

          <div>

            <strong>
              Situation déficitaire
            </strong>

            <p>
              Les dépenses enregistrées
              dépassent les revenus encaissés.
            </p>

          </div>

        </div>

      ) : forecastIsNegative ? (

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
              si toutes les enveloppes
              restantes sont consommées.
            </p>

          </div>

        </div>

      ) : totals.overBudget > 0 ? (

        <div className="alert-card">

          <AlertTriangle
            size={21}
          />

          <div>

            <strong>
              Des enveloppes sont dépassées
            </strong>

            <p>
              Total des dépassements :{" "}
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
            Situation maîtrisée :
            aucun dépassement.
          </span>

        </div>

      )}

      {/* ALERTES */}

      {alerts.length >
        0 && (

        <div
          className="alert-list"
          style={{
            marginTop: 8,
          }}
        >

          {alerts.map(
            (envelope) => (

              <div
                className="alert-card"
                key={
                  envelope.id
                }
              >

                <AlertTriangle
                  size={18}
                />

                <div>

                  <strong>
                    {envelope.name}
                  </strong>

                  <p>

                    {Number(
                      envelope.spent
                    ) >
                    Number(
                      envelope.budget
                    )
                      ? `Dépassement de ${formatMoney(
                          Number(
                            envelope.spent
                          ) -
                            Number(
                              envelope.budget
                            )
                        )}`
                      : "Budget atteint."}

                  </p>

                </div>

              </div>

            )
          )}

        </div>

      )}

      <button
        className="primary-button full"
        onClick={
          onAdd
        }
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
        aria-label="Mois précédent"
        onClick={
          onPrevious
        }
        type="button"
      >
        <ChevronLeft
          size={20}
        />
      </button>

      <strong>
        {label}
      </strong>

      <button
        aria-label="Mois suivant"
        onClick={
          onNext
        }
        type="button"
      >
        <ChevronRight
          size={20}
        />
      </button>

    </div>
  );
}

/* ============================================================
   CARTE STATISTIQUE
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
    Number(
      envelope.budget || 0
    );

  const spent =
    Number(
      envelope.spent || 0
    );

  const percentage =
    budget === 0
      ? 0
      : (spent /
          budget) *
        100;

  const status =
    percentage >= 100
      ? "danger"
      : percentage >= 80
      ? "warning"
      : "normal";

  const difference =
    budget - spent;

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
            difference <
            0
              ? "danger-text"
              : ""
          }
        >

          {difference <
          0
            ? `+${formatMoney(
                Math.abs(
                  difference
                )
              )}`
            : `Reste ${formatMoney(
                difference
              )}`}

        </span>

      </div>

    </div>
  );
}

/* ============================================================
   TITRE SECTION
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

        {month.fixedExpenses.map(
          (expense) => (

            <div
              className="simple-row"
              key={
                expense.id
              }
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
              key={
                envelope.id
              }
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
        subtitle="Vos mouvements récents"
      />

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

            )
          )}

      </div>

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

            const percentage =
              goal.target ===
              0
                ? 0
                : (goal.current /
                    goal.target) *
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
                        goal.target
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
                      goal.current
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
  const monitoredEnvelopes =
    month.envelopes.filter(
      (item) => {

        const budget =
          Number(
            item.budget || 0
          );

        const spent =
          Number(
            item.spent || 0
          );

        return (
          budget > 0 &&
          spent /
              budget >=
            0.8
        );
      }
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
          Part des revenus encaissés
          déjà consommée par les dépenses,
          hors épargne.
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
            Dépenses
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
            Charges encore à payer
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

        {monitoredEnvelopes.length ===
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

          monitoredEnvelopes.map(
            (item) => {

              const budget =
                Number(
                  item.budget || 0
                );

              const spent =
                Number(
                  item.spent || 0
                );

              return (

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
                      (spent /
                        budget) *
                      100
                    ).toFixed(
                      0
                    )}
                    %
                  </strong>

                </div>

              );

            }
          )

        )}

      </section>

    </div>
  );
}

/* ============================================================
   TITRE PAGE
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
   MODALE AJOUT DÉPENSE
============================================================ */

function AddTransactionModal({
  onClose,
  onSave,
  envelopes,
  fixedExpenses,
}) {
  const availableEnvelopes =
    envelopes.filter(
      (item) =>
        item.name !==
        "Épargne"
    );

  const [form, setForm] =
    useState({

      label: "",

      amount: "",

      category:
        availableEnvelopes[0]
          ?.name ||
        "Autre",

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

    if (
      !form.amount ||
      Number(
        form.amount
      ) <= 0
    ) {
      return;
    }

    const fixedExpense =
      fixedExpenses.find(
        (item) =>
          item.id ===
          form.fixedExpenseId
      );

    const finalLabel =
      isFixed &&
      fixedExpense
        ? fixedExpense.label
        : form.label;

    if (!finalLabel) {
      return;
    }

    onSave({

      ...form,

      label:
        finalLabel,

      type:
        "expense",

      amount:
        Number(
          form.amount
        ),

      category:
        form.category,

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
        onClick={(
          event
        ) =>
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
              step="0.01"
              min="0"
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

              {availableEnvelopes.map(
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
