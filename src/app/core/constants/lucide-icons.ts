import { Optional, Provider, SkipSelf, ValueProvider } from '@angular/core';
import {
  LUCIDE_ICONS,
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideArrowLeft,
  LucideBadgeDollarSign,
  LucideBot,
  LucideBriefcaseBusiness,
  LucideCalendar,
  LucideCalendarClock,
  LucideCalendarDays,
  LucideChartNoAxesCombined,
  LucideChartNoAxesColumnIncreasing,
  LucideChartSpline,
  LucideCheck,
  LucideCircleCheck,
  LucideCircleDollarSign,
  LucideCircleOff,
  LucideClock,
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronUp,
  LucideCreditCard,
  LucideCopy,
  LucideEdit,
  LucideDownload,
  LucideFileDown,
  LucideFileSpreadsheet,
  LucideEye,
  LucideEyeOff,
  LucideFilter,
  LucideHandshake,
  LucideHome,
  LucideInbox,
  LucideInfo,
  LucideLink,
  LucideLandmark,
  LucideLayoutDashboard,
  LucideListChecks,
  LucideLock,
  LucideLogOut,
  LucideMail,
  LucideMaximize2,
  LucideMenu,
  LucideMinimize2,
  LucideMessageCircle,
  LucideMic,
  LucideMoon,
  LucidePlus,
  LucidePrinter,
  LucidePencil,
  LucidePhone,
  LucidePower,
  LucideReceiptText,
  LucideRefreshCw,
  LucideSearch,
  LucideSave,
  LucideServerCrash,
  LucideSettings,
  LucideShieldCheck,
  LucideSparkles,
  LucideSprout,
  LucideSun,
  LucideTags,
  LucideTrash2,
  LucideTractor,
  LucideTrophy,
  LucideTrendingDown,
  LucideTrendingUp,
  LucideUnlink,
  LucideUser,
  LucideUserRoundCog,
  LucideUsers,
  LucideWallet,
  LucideX,
  provideLucideIcons,
} from '@lucide/angular';

type LucideIconMap = Record<string, unknown>;

export function provideLocalLucideIcons(
  ...icons: Parameters<typeof provideLucideIcons>
): Provider {
  const localProvider = provideLucideIcons(...icons) as ValueProvider;
  const localIcons = localProvider.useValue as LucideIconMap;

  return {
    provide: LUCIDE_ICONS,
    deps: [[new Optional(), new SkipSelf(), LUCIDE_ICONS]],
    useFactory: (parentIcons: LucideIconMap | null) => ({
      ...parentIcons,
      ...localIcons,
    }),
  };
}

export function provideGlobalLucideIcons(): Provider {
  return provideLucideIcons(LucideAlertCircle, LucideCheck, LucideX);
}

export function provideAppLayoutLucideIcons(): Provider {
  return provideLocalLucideIcons(
    LucideCalendarClock,
    LucideChartNoAxesCombined,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMenu,
    LucideMoon,
    LucideReceiptText,
    LucideSettings,
    LucideSparkles,
    LucideSprout,
    LucideSun,
    LucideTractor,
    LucideUsers,
  );
}

export function provideAuthLucideIcons(): Provider {
  return provideLucideIcons(
    LucideCalendar,
    LucideChartNoAxesColumnIncreasing,
    LucideEye,
    LucideEyeOff,
    LucideLock,
    LucideMail,
    LucideSprout,
  );
}

export function provideLandingLucideIcons(): Provider {
  return provideLucideIcons(
    LucideCalendarClock,
    LucideChartNoAxesCombined,
    LucideChartSpline,
    LucideChevronDown,
    LucideChevronRight,
    LucideClock,
    LucideInbox,
    LucideListChecks,
    LucideMenu,
    LucideMessageCircle,
    LucideMic,
    LucideReceiptText,
    LucideShieldCheck,
    LucideSparkles,
    LucideSprout,
    LucideTractor,
    LucideTrophy,
    LucideTrendingDown,
    LucideTrendingUp,
    LucideWallet,
  );
}

export function provideServerErrorLucideIcons(): Provider {
  return provideLucideIcons(LucideHome, LucideRefreshCw, LucideServerCrash);
}

export function provideDashboardLucideIcons(): Provider {
  return provideLocalLucideIcons(
    LucideAlertTriangle,
    LucideCalendar,
    LucideCalendarClock,
    LucideCalendarDays,
    LucideChartNoAxesColumnIncreasing,
    LucideChevronDown,
    LucideChevronUp,
    LucideCircleCheck,
    LucideClock,
    LucideDownload,
    LucideFilter,
    LucideInfo,
    LucideLandmark,
    LucideLink,
    LucideSave,
    LucideTrophy,
    LucideTrendingDown,
    LucideTrendingUp,
    LucideWallet,
  );
}

export function provideFarmsLucideIcons(): Provider {
  return provideLucideIcons(LucideEdit, LucideFilter, LucideInfo, LucideSearch, LucideSave);
}

export function providePeopleLucideIcons(): Provider {
  return provideLucideIcons(
    LucideEdit,
    LucideFilter,
    LucideInfo,
    LucideLink,
    LucideMail,
    LucidePencil,
    LucidePhone,
    LucideSearch,
    LucideSave,
    LucideUser,
    LucideUserRoundCog,
  );
}

export function provideRegistrationsLucideIcons(): Provider {
  return provideLucideIcons(
    LucideEdit,
    LucideFilter,
    LucideInfo,
    LucidePencil,
    LucideSearch,
    LucideSave,
    LucideTags,
  );
}

export function provideTransactionsLucideIcons(): Provider {
  return provideLucideIcons(
    LucideCalendar,
    LucideCalendarDays,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronUp,
    LucideDownload,
    LucideEdit,
    LucideFileSpreadsheet,
    LucideFilter,
    LucideLink,
    LucidePencil,
    LucidePlus,
    LucidePrinter,
    LucideReceiptText,
    LucideSearch,
    LucideSave,
    LucideSettings,
    LucideTrendingDown,
    LucideTrendingUp,
    LucideUser,
    LucideWallet,
  );
}

export function provideFinancialReportLucideIcons(): Provider {
  return provideLocalLucideIcons(
    LucideCalendar,
    LucideCalendarDays,
    LucideChartNoAxesCombined,
    LucideChartNoAxesColumnIncreasing,
    LucideChartSpline,
    LucideCircleCheck,
    LucideCircleDollarSign,
    LucideFileSpreadsheet,
    LucideFilter,
    LucideInbox,
    LucideInfo,
    LucideLayoutDashboard,
    LucideLink,
    LucideMaximize2,
    LucideMinimize2,
    LucidePencil,
    LucidePrinter,
    LucideReceiptText,
    LucideShieldCheck,
    LucideSettings,
    LucideSprout,
    LucideTags,
    LucideTractor,
    LucideTrendingDown,
    LucideTrendingUp,
    LucideUnlink,
    LucideWallet,
    LucideX,
  );
}

export function provideHarvestsLucideIcons(): Provider {
  return provideLocalLucideIcons(
    LucideAlertTriangle,
    LucideBadgeDollarSign,
    LucideCalendar,
    LucideCalendarClock,
    LucideCalendarDays,
    LucideChartNoAxesCombined,
    LucideChartNoAxesColumnIncreasing,
    LucideChartSpline,
    LucideCircleCheck,
    LucideClock,
    LucideChevronDown,
    LucideChevronRight,
    LucideEdit,
    LucideFilter,
    LucideInfo,
    LucideLayoutDashboard,
    LucideListChecks,
    LucidePencil,
    LucidePlus,
    LucideReceiptText,
    LucideSearch,
    LucideSave,
    LucideSettings,
    LucideSprout,
    LucideTractor,
    LucideTrash2,
    LucideTrophy,
    LucideTrendingDown,
    LucideTrendingUp,
    LucideWallet,
  );
}

export function provideUpcomingBillsLucideIcons(): Provider {
  return provideLucideIcons(
    LucideCalendar,
    LucideCalendarClock,
    LucideClock,
    LucideEdit,
    LucideFilter,
    LucideInfo,
    LucideLandmark,
    LucideSave,
    LucideTractor,
    LucideTrendingDown,
    LucideTrendingUp,
    LucideWallet,
  );
}

export function provideProfileLucideIcons(): Provider {
  return provideLucideIcons(
    LucideCopy,
    LucideEdit,
    LucideInfo,
    LucideLink,
    LucideMail,
    LucideMessageCircle,
    LucidePencil,
    LucidePhone,
    LucidePlus,
    LucideRefreshCw,
    LucideSave,
    LucideUnlink,
    LucideUser,
  );
}

export function provideUiTestLucideIcons(): Provider {
  return provideLucideIcons(LucideInbox, LucideInfo, LucideSearch);
}

/** Provides every registered application icon for isolated component tests. */
export function provideGestaoDiretaIcons(): Provider {
  return provideLucideIcons(
    LucideAlertCircle,
    LucideAlertTriangle,
    LucideArrowLeft,
    LucideBadgeDollarSign,
    LucideBot,
    LucideBriefcaseBusiness,
    LucideCalendar,
    LucideCalendarClock,
    LucideCalendarDays,
    LucideChartNoAxesCombined,
    LucideChartNoAxesColumnIncreasing,
    LucideChartSpline,
    LucideCheck,
    LucideCircleCheck,
    LucideCircleDollarSign,
    LucideCircleOff,
    LucideClock,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronUp,
    LucideCreditCard,
    LucideCopy,
    LucideEdit,
    LucideDownload,
    LucideFileDown,
    LucideFileSpreadsheet,
    LucideEye,
    LucideEyeOff,
    LucideFilter,
    LucideHandshake,
    LucideHome,
    LucideInbox,
    LucideInfo,
    LucideLink,
    LucideLandmark,
    LucideLayoutDashboard,
    LucideListChecks,
    LucideLock,
    LucideLogOut,
    LucideMail,
    LucideMenu,
    LucideMessageCircle,
    LucideMic,
    LucideMoon,
    LucidePlus,
    LucidePrinter,
    LucidePencil,
    LucidePhone,
    LucidePower,
    LucideReceiptText,
    LucideRefreshCw,
    LucideSearch,
    LucideSave,
    LucideServerCrash,
    LucideSettings,
    LucideShieldCheck,
    LucideSparkles,
    LucideSprout,
    LucideSun,
    LucideTags,
    LucideTrash2,
    LucideTractor,
    LucideTrophy,
    LucideTrendingDown,
    LucideTrendingUp,
    LucideUnlink,
    LucideUser,
    LucideUserRoundCog,
    LucideUsers,
    LucideWallet,
    LucideX,
  );
}
