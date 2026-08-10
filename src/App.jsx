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

    if (saved) {
      const parsed = JSON.parse(saved);

      /*
       * Sécurité :
       * si les anciennes données sont incomplètes,
       * on revient aux données initiales.
       */
      if (
        parsed &&
        parsed.months &&
        parsed.currentMonth
      ) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(
      "Impossible de charger les données.",
      error
    );
  }

  return initialData;
}


/* ============================================================
   OUTILS DE GESTION DES MOIS
============================================================ */

/*
 * Transforme "2026-08" en "2026-07", "2026-09", etc.
 */

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


/*
 * Crée le libellé français du mois.
 */

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


/*
 * Première date du mois.
 */

function getFirstDateOfMonth(monthKey) {
  return `${monthKey}-01`;
}


/*
 * Crée un nouveau mois à partir
 * de la structure du mois précédent.
 *
 * Les éléments structurels sont conservés :
 *
 * - budgets
 * - charges fixes prévues
 * - enveloppes
 * - objectifs
 *
 * Les éléments propres au mois sont réinitialisés :
 *
 * - revenus réels
 * - charges réellement payées
 * - dépenses d'enveloppes
 * - transactions
 */

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

    /*
     * Les objectifs sont des données
     * qui dépassent le mois.
     *
     * On conserve donc leur progression.
     */
    goals: sourceMonth.goals.map(
      (goal) => ({
        ...goal,
      })
    ),
  };
}


/*
 * S'assure qu'un mois existe.
 *
 * Si le mois n'existe pas :
 * → création automatique.
 */

function ensureMonthExists(
  budgetData,
  monthKey
) {
  if (
    budgetData.months[monthKey]
  ) {
    return budgetData;
  }

  const existingKeys =
    Object.keys(
      budgetData.months
    );

  /*
   * On prend le mois le plus proche
   * comme modèle.
   */
  const templateKey =
    existingKeys
      .sort()
      .find(
        (key) => key <= monthKey
      ) ||
    existingKeys.sort()[0];

  const template =
    budgetData.months[
      templateKey
    ];

  const newMonth =
    createMonthFromTemplate(
      template,
      monthKey
    );

  return {
    ...budgetData,

    months: {
      ...budgetData.months,

      [monthKey]: newMonth,
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


  /*
   * Le mois actuellement sélectionné.
   */

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
     NAVIGATION ENTRE LES MOIS
  ========================================================== */

  const changeMonth = (direction) => {
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

    const newData = {
      ...preparedData,

      currentMonth:
        newMonthKey,
    };

    saveData(newData);
  };


  /* ==========================================================
     CALCULS FINANCIERS
  ========================================================== */

  const totals = useMemo(() => {

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


    const actualExpenses =
      fixedActual +
      variableSpent;


    const plannedExpenses =
      fixedPlanned +
      variableBudget;


    /*
     * Argent réellement disponible
     * maintenant.
     */

    const availableNow =
      incomeActual -
      fixedActual -
      envelopeSpent;


    /*
     * Argent qui devrait rester
     * après consommation du budget
     * encore disponible.
     */

    const forecastEnd =
      availableNow -
      envelopeRemaining;


    /*
     * Prévision initiale du mois.
     */

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

      fixedPlanned,
      fixedActual,

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
      forecastEnd,
      plannedEnd,

      overBudget,
      expenseRate,
    };

  }, [currentMonth]);


  /* ==========================================================
     AJOUT D'UNE TRANSACTION
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


    /*
     * Une dépense augmente
     * automatiquement l'enveloppe
     * correspondante.
     */

    if (
      transaction.type ===
      "expense"
    ) {

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


    /*
     * Un revenu ajouté est
     * enregistré dans les revenus.
     */

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


    const newData = {
      ...data,

      months: {
        ...data.months,

        [data.currentMonth]:
          updatedMonth,
      },
    };


    saveData(newData);

    setShowAddModal(false);
  };


  /* ==========================================================
     AFFICHAGE
  ========================================================== */

  return (
    <div className="app">


      {/* ======================================================
          HEADER
      ====================================================== */}

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


      {/* ======================================================
          CONTENU
      ====================================================== */}

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


      {/* ======================================================
          BOUTON AJOUT
      ====================================================== */}

      <button
        className="floating-button"
        onClick={() =>
          setShowAddModal(true)
        }
        aria-label="Ajouter"
      >
        <Plus size={25} />
      </button>


      {/* ======================================================
          NAVIGATION
      ====================================================== */}

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


      {/* ======================================================
          MODALE
      ====================================================== */}

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

        />

      )}

    </div>
  );
}


/* ============================================================
   BOUTON DE NAVIGATION
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


      {/* ==================================================
          NAVIGATION MOIS
      ================================================== */}

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


      {/* ==================================================
          INDICATEUR PRINCIPAL
      ================================================== */}

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
            Si tu respectes encore ton
            budget, il devrait rester{" "}

            <b>
              {formatMoney(
                totals.forecastEnd
              )}
            </b>

            {" "}en fin de mois.
          </small>

        </div>


        <div className="hero-icon">

          <WalletCards
            size={30}
          />

        </div>

      </section>


      {/* ==================================================
          INDICATEURS
      ================================================== */}

      <section className="stats-grid">

        <StatCard

          title="Revenus encaissés"

          value={
            totals.incomeActual
          }

          planned={
            totals.incomePlanned
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


      {/* ==================================================
          SYNTHÈSE
      ================================================== */}

      <section className="summary-card">

        <div>

          <span>
            Disponible maintenant
          </span>

          <strong>
            {formatMoney(
              totals.availableNow
            )}
          </strong>

        </div>


        <div>

          <span>
            Encore à prévoir
          </span>

          <strong>
            {formatMoney(
              totals.envelopeRemaining
            )}
          </strong>

        </div>


        <div>

          <span>
            Dépassements
          </span>

          <strong
            className={
              totals.overBudget >
              0
                ? "danger-text"
                : ""
            }
          >
            {formatMoney(
              totals.overBudget
            )}
          </strong>

        </div>

      </section>


      {/* ==================================================
          ENVELOPPES
      ================================================== */}

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


      {/* ==================================================
          ÉTAT DU MOIS
      ================================================== */}

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
              Si tu dépenses tout ce qui
              reste dans les enveloppes,
              le budget prévisionnel devient
              négatif.
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


      {/* ==================================================
          ALERTES ENVELOPPES
      ================================================== */}

      {alerts.length > 0 && (

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


      {/* ==================================================
          AJOUT
      ================================================== */}

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
            difference < 0
              ? "danger-text"
              : ""
          }
        >

          {difference < 0
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
   TITRE DE SECTION
============================================================ */

function SectionTitle({
  title,
  action,
}) {

  return (

    <div className="section-title">

      <h2>
        {title}
      </h2>


      {action && (

        <button>
          {action}
        </button>

      )}

    </div>
  );
}


/* ============================================================
   PAGE BUDGET
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
            Disponible
          </span>

          <strong>
            {formatMoney(
              totals.availableNow
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
            Disponible maintenant
          </span>

          <strong>
            {formatMoney(
              totals.availableNow
            )}
          </strong>

        </div>


        <div className="analysis-row total">

          <span>
            Prévision fin de mois
          </span>

          <strong>
            {formatMoney(
              totals.forecastEnd
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
   TITRE DE PAGE
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
}) {

  /*
   * L'épargne n'est pas proposée comme
   * catégorie de dépense courante.
   */

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
        envelopes[0]?.name ||
        "Autre",

      payment:
        "Carte bancaire",

      date:
        new Date()
          .toISOString()
          .split("T")[0],

    });


  const submit = (
    event
  ) => {

    event.preventDefault();


    if (
      !form.label ||
      !form.amount ||
      Number(
        form.amount
      ) <= 0
    ) {
      return;
    }


    onSave({

      ...form,

      type:
        "expense",

      amount:
        Number(
          form.amount
        ),

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


          <label>

            Libellé

            <input

              value={
                form.label
              }

              onChange={(
                e
              ) =>
                setForm({
                  ...form,

                  label:
                    e.target.value,
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

              min="0"

              value={
                form.amount
              }

              onChange={(
                e
              ) =>
                setForm({
                  ...form,

                  amount:
                    e.target.value,
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
                e
              ) =>
                setForm({
                  ...form,

                  category:
                    e.target.value,
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


          <label>

            Moyen de paiement

            <select

              value={
                form.payment
              }

              onChange={(
                e
              ) =>
                setForm({
                  ...form,

                  payment:
                    e.target.value,
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
                e
              ) =>
                setForm({
                  ...form,

                  date:
                    e.target.value,
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
