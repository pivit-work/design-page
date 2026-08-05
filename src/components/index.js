// Shared
export { default as Icon } from './shared/Icon.jsx';
export { default as SegmentedControl } from './shared/SegmentedControl.jsx';
export { default as Tabs } from './shared/Tabs.jsx';
export { default as DatePicker } from './shared/DatePicker.jsx';

// Layout
export { default as Sidebar } from './layout/Sidebar.jsx';
export { default as TopNav } from './layout/TopNav.jsx';

// Org Chart
export {
  DeptCard,
  MemberCard,
  OrgNode,
  BezierConnectors,
  ProfileModal,
  OrgChartCanvas,
  ProjectCanvas,
  LEVEL_COLORS,
  MEMBER_STATUSES,
  STATUS_KEYS,
  DEFAULT_PROFILE,
  PositionsContext,
  ModalContext,
  MoveContext,
  DragContext,
  loadPositions,
  savePositions,
  usePositions,
  useDrag,
} from './orgchart/index.js';

// Timeline
export {
  TimelineCanvas,
  NameColumn as TimelineNameColumn,
  TimelineGrid,
  MeetingBlock as TimelineMeetingBlock,
  TimelineDataProvider,
  useTimelineData,
  MEMBER_COLORS as TIMELINE_MEMBER_COLORS,
  memberPalette as timelineMemberPalette,
  formatIsoDate as timelineFormatIsoDate,
  TODAY_STR as TIMELINE_TODAY_STR,
} from './timeline/index.js';

// Meetings (회의록)
export {
  MeetingsCanvas,
  MeetingInProgressModal,
  MeetingEndConfirmModal,
  MeetingRecordContent,
  MeetingShareContent,
  RecordMethodModal,
  MicSelectModal,
  MeetingStartFlow,
  MeetingGeneratingModal,
  MeetingSyncToast,
} from './meetings/index.js';

// 1on1
export {
  ProgressBar as OneOnOneProgressBar,
  Tag as OneOnOneTag,
  StatusBadge as OneOnOneStatusBadge,
  StatCard as OneOnOneStatCard,
  MemberCard as OneOnOneMemberCard,
  OneOnOneDashboardCanvas,
  PROGRESS_COLORS as ONEONONE_PROGRESS_COLORS,
  STATUS_BADGE as ONEONONE_STATUS_BADGE,
  TAG_TYPES as ONEONONE_TAG_TYPES,
} from './oneonone/index.js';

// OKR
export {
  OkrTabNav,
  OkrToolbar,
  OkrSelectMenu,
  OkrDashboardCanvas,
  OkrGroupCard,
  OkrGroupNode,
  ObjectiveRow,
  OkrProgressBar,
  OkrMemberChip,
  OkrConnectors,
  OkrDetailModal,
  OkrPersonalCanvas,
  OkrLinkedParents,
  OkrAiInsights,
  OkrOverallCard,
  OkrObjectiveSection,
  OkrFeedbackComposeModal,
  OkrKrFeedbackModal,
  OkrKrUpdateModal,
  OkrStrategyCanvas,
  OkrHistoryQuarter,
  OkrBoard,
  OkrTeamCanvas,
  OkrComposeFullModal,
  OkrSetupWizardModal,
} from './okr/index.js';

// Report
export {
  ReportCanvas,
  ReportWeeklyRow,
  ReportStatsRow,
  ReportViewerModal,
} from './report/index.js';

// Snippet (스니핏 히스토리)
export {
  SnippetCanvas,
  SnippetMemberAvatars,
  SnippetListRow,
  SnippetDatePicker,
} from './snippet/index.js';

// Action items (액션 아이템)
export { ActionItemsCanvas } from './actionitems/index.js';

// Resource (리소스 투입 현황)
export { ResourceCanvas } from './resource/index.js';

// Manager
export {
  ManagerCanvas,
  ManagerMemberCard,
  ManagerSplineHero,
  ManagerStatusBadge,
  ManagerSummaryCard,
  ManagerStatTile,
  ManagerSectionHeading,
  ManagerKrDrilldown,
  ManagerKrMemberCard,
  ManagerKrContributionDetail,
  ManagerTeamSnippets,
  ManagerTeamSnippetSidebar,
  ManagerTeamSnippetFeed,
  MANAGER_STATUS_COLORS,
} from './manager/index.js';

// Admin
export { AdminDashboardCanvas } from './admin/index.js';
export { AdminEmployeesCanvas } from './admin/index.js';
export { AdminEmployeeSheetCanvas } from './admin/index.js';
export { AdminRbacCanvas } from './admin/index.js';
export { AdminTeamCanvas } from './admin/index.js';
export { TeamIcon } from './admin/index.js';
export { OrgSnapshotCanvas } from './admin/index.js';
export { AdminNotificationsCanvas } from './admin/index.js';
export { AdminIntegrationsCanvas } from './admin/index.js';
export { AdminAiPromptsCanvas } from './admin/index.js';
export { BillingOverviewCanvas } from './admin/index.js';
export { BillingPlansCanvas } from './admin/index.js';
export { BillingCheckoutCanvas } from './admin/index.js';
export { BillingMethodsCanvas } from './admin/index.js';
export { BillingHistoryCanvas } from './admin/index.js';
export { BillingSettingsCanvas } from './admin/index.js';
export { BillingContactSalesCanvas } from './admin/index.js';
export {
  TierGate,
  UpsellCard,
  LockBadge,
  FEATURE_TIER,
  TIER_RANK,
  isAccessible,
} from './admin/index.js';

// 내 설정
export { MySettingsCanvas } from './settings/index.js';

// 내 프로필 (읽기 전용 표출, `/me`)
export { MyProfileCanvas } from './myprofile/index.js';

// Eval cycle (성과 평가)
export { default as EvalCycleHrCanvas } from './eval/EvalCycleHrCanvas.jsx';
export { default as EvalCycleExcludedCanvas } from './eval/EvalCycleExcludedCanvas.jsx';
export { default as EvalCycleMemberCanvas } from './eval/EvalCycleMemberCanvas.jsx';
export { default as EvalCyclePeerConfirmCanvas } from './eval/EvalCyclePeerConfirmCanvas.jsx';
export { default as EvalCycleLeaderCanvas } from './eval/EvalCycleLeaderCanvas.jsx';
export { default as EvalCycleSummaryCanvas } from './eval/EvalCycleSummaryCanvas.jsx';
export { default as EvalCycleReportCanvas } from './eval/EvalCycleReportCanvas.jsx';
export { default as EvalReportReviewCanvas } from './eval/EvalReportReviewCanvas.jsx';
export { default as EvalPeerVolunteerCanvas } from './eval/EvalPeerVolunteerCanvas.jsx';
export { default as EvalFeedbackCanvas } from './eval/EvalFeedbackCanvas.jsx';
export { default as EvalCycleMonitoringCanvas } from './eval/EvalCycleMonitoringCanvas.jsx';
export { default as EvalCycleCalibrationCanvas } from './eval/EvalCycleCalibrationCanvas.jsx';
export { default as EvalCycleTeamCalibrationCanvas } from './eval/EvalCycleTeamCalibrationCanvas.jsx';
export { default as EvalCycleTemplateCanvas } from './eval/EvalCycleTemplateCanvas.jsx';
export { default as EvalCyclePeerTasksCanvas } from './eval/EvalCyclePeerTasksCanvas.jsx';
export { default as EvalFeedbackHrCanvas } from './eval/EvalFeedbackHrCanvas.jsx';
export { default as EvalFeedbackComposeCanvas } from './eval/EvalFeedbackComposeCanvas.jsx';
