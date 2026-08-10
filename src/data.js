export const initialData = {
  dataVersion: 3,
  currentMonth: "2026-08",

  months: {
    "2026-08": {
      label: "Août 2026",

      /* =====================================================
         REVENUS PRÉVISIONNELS

         planned = montant attendu
         actual N'EST PLUS utilisé comme source de vérité.

         Les encaissements réels seront enregistrés
         dans transactions avec incomeId.
      ===================================================== */

      income: [
        {
          id: "income-1",
          label: "Salaire",
          planned: 2553.34,
          type: "money",
        },
        {
          id: "income-2",
          label: "Allocation rentrée",
          planned: 426.87,
          type: "money",
        },
        {
          id: "income-3",
          label: "Titres restaurant",
          planned: 270,
          type: "benefit",
        },
      ],

      /* =====================================================
         CHARGES FIXES

         Le montant réel continue d'être calculé
         uniquement à partir des transactions.
      ===================================================== */

      fixedExpenses: [
        {
          id: "fixed-1",
          label: "Loyer",
          planned: 650,
          actual: 0,
        },
        {
          id: "fixed-2",
          label: "EDF",
          planned: 192.5,
          actual: 0,
        },
        {
          id: "fixed-3",
          label: "Assurances",
          planned: 88,
          actual: 0,
        },
        {
          id: "fixed-4",
          label: "Téléphone / Internet",
          planned: 55,
          actual: 0,
        },
        {
          id: "fixed-5",
          label: "Navigo",
          planned: 86.4,
          actual: 0,
        },
      ],

      /* =====================================================
         ENVELOPPES
      ===================================================== */

      envelopes: [
        {
          id: "env-1",
          name: "Courses",
          budget: 300,
          spent: 0,
          rollover: true,
        },
        {
          id: "env-2",
          name: "Loisirs",
          budget: 20,
          spent: 0,
          rollover: false,
        },
        {
          id: "env-3",
          name: "Vacances",
          budget: 50,
          spent: 0,
          rollover: true,
        },
        {
          id: "env-4",
          name: "Vêtements",
          budget: 60,
          spent: 0,
          rollover: false,
        },
        {
          id: "env-5",
          name: "Imprévus",
          budget: 50,
          spent: 0,
          rollover: true,
        },
        {
          id: "env-6",
          name: "Épargne",
          budget: 50,
          spent: 0,
          rollover: true,
        },
      ],

      /* =====================================================
         TRANSACTIONS

         Les transactions sont maintenant la SOURCE
         DE VÉRITÉ du réel.

         incomeId = revenu concerné
         fixedExpenseId = charge fixe concernée
      ===================================================== */

      transactions: [
        {
          id: "tx-1",
          type: "expense",
          label: "EDF",
          amount: 192.58,
          category: "Charges fixes",
          fixedExpenseId: "fixed-2",
          date: "2026-08-02",
          payment: "Prélèvement",
        },
      ],

      /* =====================================================
         OBJECTIFS
      ===================================================== */

      goals: [
        {
          id: "goal-1",
          name: "Vacances été 2027",
          target: 1500,
          current: 300,
          targetDate: "2027-07-01",
          monthlyContribution: 120,
        },
        {
          id: "goal-2",
          name: "Épargne de sécurité",
          target: 3000,
          current: 850,
          targetDate: "2027-12-31",
          monthlyContribution: 150,
        },
      ],
    },
  },
};
