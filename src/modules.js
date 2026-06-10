export const PLATFORM_MODULES = Object.freeze([
  {
    code: "portal",
    name: "登入入口網",
    description: "帳號登入、模組入口、個人權限與系統通知。"
  },
  {
    code: "system",
    name: "權限中心",
    description: "使用者、角色、職位、權限矩陣與資料範圍管理。"
  },
  {
    code: "hr",
    name: "人資系統",
    description: "員工主檔、組織、職位、到離職與帳號狀態。"
  },
  {
    code: "accounting",
    name: "會計系統",
    description: "收支、請款、付款、核准流程與財務報表。"
  },
  {
    code: "care",
    name: "照顧服務",
    description: "居家照顧、日間照顧、個案、排班與服務紀錄。"
  },
  {
    code: "general_affairs",
    name: "總務系統",
    description: "採購、資產、用品、維修與供應商。"
  },
  {
    code: "projects",
    name: "敏捷專案管理",
    description: "專案、任務、看板、負責人與進度追蹤。"
  },
  {
    code: "cms",
    name: "網站後台管理",
    description: "文章、頁面、活動、媒體、SEO 與發布審核。"
  }
]);

export const PLATFORM_PERMISSIONS = Object.freeze([
  "portal.dashboard.view",
  "system.users.view",
  "system.users.manage",
  "system.roles.view",
  "system.roles.manage",
  "system.permissions.view",
  "system.permissions.manage",
  "hr.employee.view",
  "hr.employee.manage",
  "hr.position.view",
  "hr.position.manage",
  "accounting.invoice.view",
  "accounting.invoice.manage",
  "accounting.invoice.approve",
  "care.homecase.view",
  "care.homecase.assign",
  "care.daycare.view",
  "care.daycare.assign",
  "general_affairs.asset.view",
  "general_affairs.asset.manage",
  "projects.board.view",
  "projects.board.manage",
  "cms.content.view",
  "cms.content.manage",
  "cms.content.publish"
]);

export function moduleFromPermission(permission) {
  if (typeof permission !== "string" || !permission.includes(".")) return null;
  return permission.split(".")[0];
}
