export const environment = {
  production: false,
  apiBaseUrl: 'https://localhost:7151', 

  apiEndpoints: {
    auth: {
      login: '/api/Auth/login',
      register: '/api/Auth/register',
      logout: '/api/Auth/logout'
    },
    books: {
      getAll: '/api/Books',
      getById: '/api/Books/', // Append ID when using
      create: '/api/Books',
      update: '/api/Books',
      delete: '/api/Books/', // Append ID when using
      search: '/api/Books/search'
    },
    borrowing: {
      getAll: '/api/Borrowing',
      getById: '/api/Borrowing/', // Append ID when using
      borrow: '/api/Borrowing/borrow',
      return: '/api/Borrowing/return',
      overdue: '/api/Borrowing/overdue',
      memberHistory: '/api/Borrowing/member/', // Append memberID when using
      memberHistoryByName: '/api/Borrowing/member/name/' // Append name when using
    },
    fines: {
      getAll: '/api/Fines',
      getById: '/api/Fines/', // Append ID when using
      getMemberFines: '/api/Fines/member/', // Append memberID when using
      getMemberFinesByName: '/api/Fines/member/name/', // Append name when using
      applyOverdueFines: '/api/Fines/apply-overdue-fines',
      pay: '/api/Fines/PayFine/',
      create: '/api/Fines',
      update: '/api/Fines',
      delete: '/api/Fines/' // Append ID when using
    },
    notifications: {
      getAll: '/api/Notifications',
      getById: '/api/Notifications/', // Append ID when using
      create: '/api/Notifications',
      update: '/api/Notifications/', // Append ID when using
      delete: '/api/Notifications/', // Append ID when using
      getMemberNotifications: '/api/Notifications/member/', // Append memberID when using
      getMemberNotificationsByName: '/api/Notifications/member/name/', // Append name when using
      notifyDueBooks: '/api/Notifications/notify-due-books',
      notifyOverdueBooks: '/api/Notifications/notify-overdue-books',
      notifyFinePayment: '/api/Notifications/notify-fine-payment/', // Append fineID when using
      notifyMembershipStatus: '/api/Notifications/notify-membership-status/', // Append memberId/newStatus when using
      performPeriodicChecks: '/api/Notifications/perform-periodic-checks'
    },
    members: {
      getAll: '/api/Member',
      getById: '/api/Member/', // Append ID when using
      register: '/api/Member/register',
      update: '/api/Member/', // Append ID when using
      delete: '/api/Member/', // Append ID when using
      getMemberBorrowings: '/api/Member/', // Append "ID/borrowings" when using
      getMemberFines: '/api/Member/', // Append "ID/fines" when using
      checkMembershipStatus: '/api/Member/check-membership-status',
      byEmail: '/api/Member/by-email'
    }
  }
};