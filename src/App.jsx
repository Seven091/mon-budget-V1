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

  const currentMonth = data.months[data.currentMonth];

  const saveData = (newData) => {
    setData(newData);
    localStorage.setItem("mon-budget-data", JSON.stringify(newData));
  };

  /*
   * ============================================================
   * CALCULS FINANCIERS
   * ============================================================
   *
   * Nous séparons volontairement :
   *
   * 1. Le prévisionnel
   * 2. Le réel
   * 3. Le disponible maintenant
   * 4. La prévision de fin de mois
   */

  const totals = useMemo(() => {
    const incomePlanned = currentMonth.income.reduce(
      (sum, item) => sum + Number(item.planned || 0),
      0
    );

    const incomeActual = currentMonth.income.reduce(
      (sum, item) => sum + Number(item.actual || 0),
      0
    );

    const fixedPlanned = currentMonth.fixedExpenses.reduce(
      (sum, item) => sum + Number(item.planned || 0),
      0
    );

    const fixedActual = currentMonth.fixedExpenses.reduce(
      (sum, item) => sum + Number(item.actual || 0),
      0
    );

    const envelopeBudget = currentMonth.envelopes.reduce(
      (sum, item) => sum + Number(item.budget || 0),
      0
    );

    const envelopeSpent = currentMonth.envelopes.reduce(
      (sum, item) => sum + Number(item.spent || 0),
      0
    );

    const envelopeRemaining = currentMonth.envelopes.reduce(
      (sum, item) =>
        sum +
        Math.max(
          Number(item.budget || 0) - Number(item.spent || 0),
          0
        ),
      0
    );

    const overBudget = currentMonth.envelopes.reduce(
      (sum, item) =>
        sum +
        Math.max(
          Number(item.spent || 0) - Number(item.budget || 0),
          0
        ),
      0
    );

    const savingsEnvelopes = currentMonth.envelopes.filter(
      (item) => item.name === "Épargne"
    );

    const savings = savingsEnvelopes.reduce(
      (sum, item) => sum + Number(item.spent || 0),
      0
    );

    const savingsBudget = savingsEnvelopes.reduce(
      (sum, item) => sum + Number(item.budget || 0),
      0
    );

    const variableEnvelopes = currentMonth.envelopes.filter(
      (item) => item.name !== "Épargne"
    );

    const variableBudget = variableEnvelopes.reduce(
      (sum, item) => sum + Number(item.budget || 0),
      0
    );

    const variableSpent = variableEnvelopes.reduce(
      (sum, item) => sum + Number(item.spent || 0),
      0
    );

    /*
     * Dépenses réellement réalisées.
     *
     * On ne compte pas l'épargne comme une dépense de consommation.
     */
    const actualExpenses = fixedActual + variableSpent;

    /*
     * Dépenses prévues hors épargne.
     */
    const plannedExpenses = fixedPlanned + variableBudget;

    /*
     * ARGENT DISPONIBLE MAINTENANT
     *
     * Revenus effectivement encaissés
     * - charges fixes effectivement payées
     * - dépenses d'enveloppes effectivement réalisées
     *
     * L'épargne est considérée comme mise de côté et non disponible.
     */
    const availableNow =
      incomeActual -
      fixedActual -
      envelopeSpent;

    /*
     * ARGENT QUI RESTERAIT EN FIN DE MOIS
     *
     * Disponible maintenant
     * - montant restant à consommer dans les enveloppes
     *
     * Cela permet de répondre à :
     *
     * "Si je respecte encore mon budget prévu,
     * combien devrait-il me rester ?"
     */
    const forecastEnd =
      availableNow - envelopeRemaining;

    /*
     * PRÉVISION INITIALE DU MOIS
     */
    const plannedEnd =
      incomePlanned -
      fixedPlanned -
      variableBudget -
      savingsBudget;

    const expenseRate =
      incomeActual === 0
        ? 0
        : (actualExpenses / incomeActual) * 100;

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

  /*
   * ============================================================
   * AJOUT D'UNE TRANSACTION
   * ============================================================
   */

  const addTransaction = (transaction) => {
    const month = data.months[data.currentMonth];

    const amount = Number(transaction.amount);

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
     * Une dépense rattachée à une enveloppe
     * augmente automatiquement son montant dépensé.
     */
    if (transaction.type === "expense") {
      updatedMonth.envelopes = month.envelopes.map(
        (envelope) =>
          envelope.name === transaction.category
            ? {
                ...envelope,
                spent:
                  Number(envelope.spent || 0) +
                  amount,
              }
            : envelope
      );
    }

    /*
     * Un revenu ajouté apparaît également dans les revenus.
     */
    if (transaction.type === "income") {
      updatedMonth.income = [
        ...month.income,
        {
          id: newTransaction.id,
          label: transaction.label,
          planned: amount,
          actual: amount,
        },
      ];
    }

    const newData = {
      ...data,
      months: {
        ...data.months,
        [data.currentMonth]: updatedMonth,
      },
    };

    saveData(newData);
    setShowAddModal(false);
  };

  return (
    <div className="app">

      {/* ======================================================
          HEADER
      ====================================================== */}

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

      {/* ======================================================
          CONTENU
      ====================================================== */}

      <main className="main">

        {activePage === "dashboard" && (
          <Dashboard
            month={currentMonth}
            totals={totals}
            onAdd={() => setShowAddModal(true)}
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
            transactions={
              currentMonth.transactions
            }
          />
        )}

        {activePage === "goals" && (
          <Goals goals={currentMonth.goals} />
        )}

        {activePage === "analysis" && (
          <Analysis
            month={currentMonth}
            totals={totals}
          />
        )}

      </main>

      {/* ======================================================
          BOUTON AJOUT
      ====================================================== */}

      <button
        className="floating-button"
        onClick={() => setShowAddModal(true)}
        aria-label="Ajouter"
      >
        <Plus size={25} />
      </button>

      {/* ======================================================
          NAVIGATION
      ====================================================== */}

      <nav className="bottom-nav">

        <NavButton
          active={activePage === "dashboard"}
          icon={<LayoutDashboard size={21} />}
          label="Accueil"
          onClick={() =>
            setActivePage("dashboard")
          }
        />

        <NavButton
          active={activePage === "budget"}
          icon={<WalletCards size={21} />}
          label="Budget"
          onClick={() =>
            setActivePage("budget")
          }
        />

        <div className="nav-spacer" />

        <NavButton
          active={
            activePage === "transactions"
          }
          icon={<Receipt size={21} />}
          label="Dépenses"
          onClick={() =>
            setActivePage("transactions")
          }
        />

        <NavButton
          active={activePage === "goals"}
          icon={<Target size={21} />}
          label="Objectifs"
          onClick={() =>
            setActivePage("goals")
          }
        />

      </nav>

      {/* ======================================================
          MODALE
      ====================================================== */}

      {showAddModal && (
        <AddTransactionModal
          onClose={() =>
            setShowAddModal(false)
          }
          onSave={addTransaction}
          envelopes={
            currentMonth.envelopes
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
}) {
  const alerts =
    month.envelopes.filter(
      (item) =>
        Number(item.budget || 0) > 0 &&
        Number(item.spent || 0) >=
          Number(item.budget || 0)
    );

  const hasNegativeAvailable =
    totals.availableNow < 0;

  const forecastIsNegative =
    totals.forecastEnd < 0;

  return (
    <div className="page">

      <MonthSelector
        label={month.label}
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
            Si tu respectes encore ton budget,
            il devrait rester{" "}
            <b>
              {formatMoney(
                totals.forecastEnd
              )}
            </b>{" "}
            en fin de mois.
          </small>

        </div>

        <div className="hero-icon">
          <WalletCards size={30} />
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
              totals.overBudget > 0
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
              key={envelope.id}
              envelope={envelope}
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

          <AlertTriangle size={21} />

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

          <AlertTriangle size={21} />

          <div>

            <strong>
              Fin de mois sous tension
            </strong>

            <p>
              Si tu dépenses tout ce qui reste
              dans les enveloppes, le budget
              prévisionnel devient négatif.
            </p>

          </div>

        </div>

      ) : totals.overBudget > 0 ? (

        <div className="alert-card">

          <AlertTriangle size={21} />

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

          <CheckCircle2 size={20} />

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
                key={envelope.id}
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
        onClick={onAdd}
      >

        <Plus size={19} />

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
}) {
  return (
    <div className="month-selector">

      <button
        aria-label="Mois précédent"
        disabled
      >
        <ChevronLeft size={20} />
      </button>

      <strong>
        {label}
      </strong>

      <button
        aria-label="Mois suivant"
        disabled
      >
        <ChevronRight size={20} />
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
        {formatMoney(value)}
      </strong>

      {planned !== undefined && (
        <small>
          Prévu :{" "}
          {formatMoney(planned)}
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
    Number(envelope.budget || 0);

  const spent =
    Number(envelope.spent || 0);

  const percentage =
    budget === 0
      ? 0
      : (spent / budget) * 100;

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
          {formatMoney(spent)}
          {" / "}
          {formatMoney(budget)}
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
                key={transaction.id}
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
        })}

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
          spent / budget >= 0.8
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

            <CheckCircle2 size={20} />

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
                  key={item.id}
                >

                  <span>
                    {item.name}
                  </span>

                  <strong>
                    {(
                      (spent / budget) *
                      100
                    ).toFixed(0)}
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
  const availableEnvelopes =
    envelopes.filter(
      (item) =>
        item.name !== "Épargne"
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

  const submit = (event) => {
    event.preventDefault();

    if (
      !form.label ||
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      return;
    }

    onSave({
      ...form,
      type: "expense",
      amount:
        Number(form.amount),
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
            type="button"
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
              value={form.amount}
              onChange={(e) =>
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
              onChange={(e) =>
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
              onChange={(e) =>
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
              value={form.date}
              onChange={(e) =>
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
