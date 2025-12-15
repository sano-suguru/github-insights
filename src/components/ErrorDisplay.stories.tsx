import type { Meta, StoryObj } from "@storybook/nextjs";
import { ErrorDisplay, ChartErrorWrapper } from "./ErrorDisplay";

const meta: Meta<typeof ErrorDisplay> = {
  title: "Components/ErrorDisplay",
  component: ErrorDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    error: {
      control: "text",
      description: "エラーメッセージまたはErrorオブジェクト",
    },
    compact: {
      control: "boolean",
      description: "コンパクト表示モード",
    },
    title: {
      control: "text",
      description: "カスタムタイトル",
    },
    onRetry: {
      action: "retry clicked",
      description: "リトライ関数",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なエラー表示
export const Default: Story = {
  args: {
    error: "データの取得に失敗しました",
  },
};

// リトライボタン付き
export const WithRetry: Story = {
  args: {
    error: "ネットワークエラーが発生しました",
    onRetry: () => console.log("Retry clicked"),
  },
};

// レート制限エラー
export const RateLimitError: Story = {
  args: {
    error: "API rate limit exceeded",
    onRetry: () => console.log("Retry clicked"),
  },
};

// コンパクトモード（セクション内表示）
export const Compact: Story = {
  args: {
    error: "データの取得に失敗しました",
    compact: true,
  },
};

// コンパクト + リトライ
export const CompactWithRetry: Story = {
  args: {
    error: "接続がタイムアウトしました",
    compact: true,
    onRetry: () => console.log("Retry clicked"),
  },
};

// コンパクト + レート制限
export const CompactRateLimitError: Story = {
  args: {
    error: "API rate limit exceeded",
    compact: true,
    onRetry: () => console.log("Retry clicked"),
  },
};

// カスタムタイトル
export const CustomTitle: Story = {
  args: {
    error: "サーバーに接続できません",
    title: "接続エラー",
    onRetry: () => console.log("Retry clicked"),
  },
};

// Errorオブジェクトを渡す
export const WithErrorObject: Story = {
  args: {
    error: new Error("Unexpected error occurred"),
    onRetry: () => console.log("Retry clicked"),
  },
};

// ChartErrorWrapper のストーリー
export const ChartWrapperWithError: StoryObj<typeof ChartErrorWrapper> = {
  render: () => (
    <div className="w-80 h-64 bg-white dark:bg-gray-800 p-4 rounded-lg">
      <ChartErrorWrapper
        isError={true}
        error={new Error("チャートデータの取得に失敗しました")}
        onRetry={() => console.log("Retry clicked")}
      >
        <div>このコンテンツは表示されません</div>
      </ChartErrorWrapper>
    </div>
  ),
};

// ChartErrorWrapper 正常時
export const ChartWrapperNormal: StoryObj<typeof ChartErrorWrapper> = {
  render: () => (
    <div className="w-80 h-64 bg-white dark:bg-gray-800 p-4 rounded-lg">
      <ChartErrorWrapper
        isError={false}
        error={null}
      >
        <div className="flex items-center justify-center h-full text-gray-600">
          チャートコンテンツ
        </div>
      </ChartErrorWrapper>
    </div>
  ),
};
