"""
能源价格 → SK海力士股价 传导模型
Energy Price -> SK Hynix Stock Price Transmission Model

研究链条: 美伊冲突 -> 原油/天然气价格 -> 韩国能源成本 -> SK海力士股价
"""

import yfinance as yf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.stattools import grangercausalitytests
from statsmodels.regression.linear_model import OLS
from statsmodels.tools import add_constant
from statsmodels.stats.stattools import durbin_watson
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import warnings
import os

warnings.filterwarnings("ignore")
plt.rcParams["font.size"] = 12

# ============================================================
# 1. 数据采集配置
# ============================================================

# 研究时间范围 (可调整)
START_DATE = "2024-01-01"
END_DATE = "2026-03-28"

# 核心变量 Ticker 映射
TICKERS = {
    # --- 目标变量 ---
    "SK_Hynix": "000660.KS",        # SK海力士 (韩国交易所)

    # --- 第一层: 原油价格 ---
    "Brent": "BZ=F",                 # Brent原油期货
    "WTI": "CL=F",                   # WTI原油期货

    # --- 第二层: 天然气/LNG ---
    "Henry_Hub": "NG=F",             # Henry Hub天然气期货
    "TTF": "TTF=F",                  # 欧洲TTF天然气期货

    # --- 第三层: 汇率 ---
    "USD_KRW": "KRW=X",             # 美元/韩元汇率

    # --- 第四层: 相关指数 ---
    "KOSPI": "^KS11",               # 韩国KOSPI综合指数
    "SOX": "^SOX",                   # 费城半导体指数
    "VIX": "^VIX",                   # VIX恐慌指数
    "EWY": "EWY",                    # iShares MSCI韩国ETF
    "SPX": "^GSPC",                  # S&P 500

    # --- 第五层: 关联公司 ---
    "KEPCO": "015760.KS",           # 韩国电力公社
    "Samsung": "005930.KS",          # 三星电子 (对比)
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 当 Yahoo Finance 不可用时使用模拟数据 (设为 False 以使用真实数据)
USE_SIMULATED = True


# ============================================================
# 2. 数据采集
# ============================================================

def generate_simulated_data(start: str, end: str) -> pd.DataFrame:
    """
    生成基于真实市场特征的模拟数据.
    价格水平和波动率参考2024-2026年实际市场数据,
    包含2026年2月28日霍尔木兹海峡封锁事件的冲击效应.
    """
    print("=" * 60)
    print("使用模拟数据 (基于真实市场特征)")
    print("提示: 设置 USE_SIMULATED = False 以使用 Yahoo Finance 真实数据")
    print("=" * 60)

    np.random.seed(42)
    dates = pd.bdate_range(start=start, end=end)
    n = len(dates)

    # 霍尔木兹海峡封锁日
    crisis_idx = np.searchsorted(dates, pd.Timestamp("2026-02-28"))

    # 共同市场因子 (日收益率层面的共同冲击)
    market_factor = np.random.normal(0, 0.008, n)
    energy_factor = np.random.normal(0, 0.010, n)
    semi_factor = np.random.normal(0, 0.012, n)

    # 危机冲击: 能源暴涨, 股市暴跌 (合理幅度)
    crisis_energy_shock = np.zeros(n)
    crisis_stock_shock = np.zeros(n)
    if crisis_idx < n:
        # 初始冲击: 能源单日+5~8%, 股市单日-3~5%
        crisis_energy_shock[crisis_idx] = 0.06
        crisis_stock_shock[crisis_idx] = -0.05
        # 后续几天持续但递减的冲击
        shock_len = min(15, n - crisis_idx - 1)
        for i in range(1, shock_len + 1):
            crisis_energy_shock[crisis_idx + i] = 0.02 * np.exp(-0.2 * i)
            crisis_stock_shock[crisis_idx + i] = -0.015 * np.exp(-0.2 * i)

    def make_price(base, daily_vol, trend, factor, factor_beta,
                   crisis_shock=None):
        noise = np.random.normal(trend, daily_vol, n)
        returns = noise + factor * factor_beta
        if crisis_shock is not None:
            returns += crisis_shock
        log_prices = np.log(base) + returns.cumsum()
        return np.exp(log_prices)

    prices = pd.DataFrame(index=dates)

    # 原油 (冲突前~$80, 冲突后飙升)
    prices["Brent"] = make_price(82, 0.018, 0.0002, energy_factor, 0.3,
                                  crisis_energy_shock * 1.2)
    prices["WTI"] = make_price(78, 0.017, 0.0002, energy_factor, 0.28,
                                crisis_energy_shock * 0.9)

    # 天然气
    prices["Henry_Hub"] = make_price(2.8, 0.025, 0.0001, energy_factor, 0.2,
                                      crisis_energy_shock * 0.5)
    prices["TTF"] = make_price(28, 0.022, 0.0003, energy_factor, 0.35,
                                crisis_energy_shock * 1.0)

    # SK海力士 (冲突前半导体超级周期上涨, 冲突后暴跌)
    prices["SK_Hynix"] = make_price(
        180000, 0.022, 0.0008, semi_factor, 0.4,
        crisis_stock_shock * 1.5 + crisis_energy_shock * -0.3
    )

    # 汇率 (冲突后韩元贬值)
    prices["USD_KRW"] = make_price(1320, 0.005, 0.0001, market_factor, -0.1,
                                    crisis_energy_shock * 0.3)

    # KOSPI
    prices["KOSPI"] = make_price(2600, 0.012, 0.0003, market_factor, 0.5,
                                  crisis_stock_shock * 1.2)

    # SOX 半导体指数
    prices["SOX"] = make_price(4500, 0.018, 0.0005, semi_factor, 0.5,
                                crisis_stock_shock * 0.8)

    # VIX (冲突后飙升)
    vix_base = 15 + np.random.normal(0, 1.5, n).cumsum() * 0.1
    if crisis_idx < n:
        vix_base[crisis_idx:] += 15  # 危机后VIX跳升
    prices["VIX"] = np.clip(vix_base, 10, 80)

    # EWY
    prices["EWY"] = make_price(58, 0.014, 0.0002, market_factor, 0.4,
                                crisis_stock_shock * 1.0)

    # S&P 500
    prices["SPX"] = make_price(4800, 0.010, 0.0003, market_factor, 0.6,
                                crisis_stock_shock * 0.3)

    # KEPCO
    prices["KEPCO"] = make_price(22000, 0.015, -0.0001, energy_factor, -0.2,
                                  crisis_energy_shock * -0.5)

    # Samsung
    prices["Samsung"] = make_price(72000, 0.018, 0.0005, semi_factor, 0.35,
                                    crisis_stock_shock * 1.3)

    for col in prices.columns:
        print(f"  [OK] {col}: {len(prices)} 条记录 (模拟)")

    print(f"\n合并后数据: {prices.shape[0]} 行 x {prices.shape[1]} 列")
    print(f"时间范围: {prices.index[0].date()} ~ {prices.index[-1].date()}")
    return prices


def fetch_data(tickers: dict, start: str, end: str) -> pd.DataFrame:
    """从 Yahoo Finance 批量下载收盘价数据"""
    if USE_SIMULATED:
        return generate_simulated_data(start, end)

    print("=" * 60)
    print("正在从 Yahoo Finance 下载数据...")
    print(f"时间范围: {start} ~ {end}")
    print("=" * 60)

    all_data = {}
    failed = []

    for name, ticker in tickers.items():
        try:
            df = yf.download(ticker, start=start, end=end, progress=False)
            if df.empty:
                print(f"  [!] {name} ({ticker}): 无数据")
                failed.append(name)
                continue
            close = df["Close"]
            if isinstance(close, pd.DataFrame):
                close = close.iloc[:, 0]
            all_data[name] = close
            print(f"  [OK] {name} ({ticker}): {len(close)} 条记录")
        except Exception as e:
            print(f"  [X] {name} ({ticker}): 下载失败 - {e}")
            failed.append(name)

    if failed:
        print(f"\n警告: 以下变量下载失败: {failed}")

    prices = pd.DataFrame(all_data)
    prices.index = pd.to_datetime(prices.index)
    prices = prices.ffill().dropna()

    if prices.empty:
        print("\n[!] Yahoo Finance 数据全部失败, 切换到模拟数据...")
        return generate_simulated_data(start, end)

    print(f"\n合并后数据: {prices.shape[0]} 行 x {prices.shape[1]} 列")
    print(f"时间范围: {prices.index[0].date()} ~ {prices.index[-1].date()}")
    return prices


# ============================================================
# 3. 数据预处理
# ============================================================

def compute_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """计算日收益率 (对数收益率)"""
    returns = np.log(prices / prices.shift(1)).dropna()
    return returns


def compute_spreads(prices: pd.DataFrame) -> pd.DataFrame:
    """计算关键价差指标"""
    spreads = pd.DataFrame(index=prices.index)

    if "Brent" in prices.columns and "WTI" in prices.columns:
        spreads["Brent_WTI_Spread"] = prices["Brent"] - prices["WTI"]

    return spreads


# ============================================================
# 4. 相关性分析
# ============================================================

def correlation_analysis(returns: pd.DataFrame) -> pd.DataFrame:
    """计算收益率相关性矩阵"""
    print("\n" + "=" * 60)
    print("相关性分析 (日收益率)")
    print("=" * 60)

    corr = returns.corr()

    if "SK_Hynix" in corr.columns:
        hynix_corr = corr["SK_Hynix"].drop("SK_Hynix").sort_values(
            key=abs, ascending=False
        )
        print("\n与SK海力士收益率的相关系数 (按绝对值排序):")
        print("-" * 45)
        for name, val in hynix_corr.items():
            bar = "+" * int(abs(val) * 30)
            sign = "+" if val > 0 else "-"
            print(f"  {name:<15} {val:>7.4f}  {sign}{bar}")

    return corr


def plot_correlation_heatmap(corr: pd.DataFrame):
    """绘制相关性热力图"""
    fig, ax = plt.subplots(figsize=(14, 10))
    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(
        corr,
        mask=mask,
        annot=True,
        fmt=".2f",
        cmap="RdBu_r",
        center=0,
        vmin=-1,
        vmax=1,
        square=True,
        ax=ax,
    )
    ax.set_title("Returns Correlation Matrix\n(Energy Prices vs SK Hynix)", fontsize=14)
    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "correlation_heatmap.png")
    fig.savefig(path, dpi=150)
    print(f"\n热力图已保存: {path}")
    plt.close()


# ============================================================
# 5. 滚动相关性分析
# ============================================================

def rolling_correlation(returns: pd.DataFrame, window: int = 60):
    """计算与SK海力士的滚动相关性 (观察传导关系的时变特征)"""
    if "SK_Hynix" not in returns.columns:
        return

    energy_vars = ["Brent", "WTI", "Henry_Hub", "TTF"]
    available = [v for v in energy_vars if v in returns.columns]

    if not available:
        return

    fig, ax = plt.subplots(figsize=(14, 6))
    for var in available:
        rolling_corr = returns["SK_Hynix"].rolling(window).corr(returns[var])
        ax.plot(rolling_corr, label=var, alpha=0.8)

    ax.axhline(y=0, color="black", linestyle="--", alpha=0.3)
    ax.set_title(
        f"Rolling {window}-day Correlation: Energy Prices vs SK Hynix Returns",
        fontsize=13,
    )
    ax.set_ylabel("Correlation")
    ax.legend(loc="best")
    ax.grid(alpha=0.3)
    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "rolling_correlation.png")
    fig.savefig(path, dpi=150)
    print(f"滚动相关性图已保存: {path}")
    plt.close()


# ============================================================
# 6. Granger 因果检验
# ============================================================

def granger_causality(returns: pd.DataFrame, max_lag: int = 10):
    """Granger因果检验: 能源价格是否 Granger-cause SK海力士收益率"""
    if "SK_Hynix" not in returns.columns:
        return

    print("\n" + "=" * 60)
    print("Granger 因果检验")
    print(f"(检验各变量是否对SK海力士有预测能力, 最大滞后={max_lag})")
    print("=" * 60)

    test_vars = [c for c in returns.columns if c != "SK_Hynix"]
    results = []

    for var in test_vars:
        try:
            data = returns[["SK_Hynix", var]].dropna()
            if len(data) < max_lag + 50:
                continue
            test = grangercausalitytests(data, maxlag=max_lag, verbose=False)
            # 取所有滞后阶数中最小的 p 值
            min_p = min(
                test[lag][0]["ssr_ftest"][1] for lag in range(1, max_lag + 1)
            )
            best_lag = min(
                range(1, max_lag + 1),
                key=lambda lag: test[lag][0]["ssr_ftest"][1],
            )
            results.append(
                {"Variable": var, "Min_P_Value": min_p, "Best_Lag": best_lag}
            )
        except Exception as e:
            print(f"  [!] {var}: 检验失败 - {e}")

    if results:
        df_results = (
            pd.DataFrame(results)
            .sort_values("Min_P_Value")
            .reset_index(drop=True)
        )
        print("\n结果 (p值越小, 预测能力越强):")
        print("-" * 55)
        for _, row in df_results.iterrows():
            sig = "***" if row["Min_P_Value"] < 0.01 else (
                "**" if row["Min_P_Value"] < 0.05 else (
                    "*" if row["Min_P_Value"] < 0.10 else ""
                )
            )
            print(
                f"  {row['Variable']:<15} p={row['Min_P_Value']:.6f}  "
                f"最佳滞后={row['Best_Lag']}天  {sig}"
            )
        print("\n显著性: *** p<0.01  ** p<0.05  * p<0.10")
        return df_results

    return None


# ============================================================
# 7. 多元回归分析
# ============================================================

def regression_analysis(returns: pd.DataFrame):
    """多元OLS回归: 能源价格对SK海力士收益率的解释力"""
    if "SK_Hynix" not in returns.columns:
        return

    print("\n" + "=" * 60)
    print("多元回归分析")
    print("Y = SK_Hynix日收益率")
    print("=" * 60)

    # 选择可用的自变量
    preferred_x = [
        "Brent", "WTI", "Henry_Hub", "TTF",
        "USD_KRW", "KOSPI", "SOX", "VIX", "EWY",
    ]
    x_vars = [v for v in preferred_x if v in returns.columns]

    if not x_vars:
        print("没有足够的自变量进行回归")
        return

    data = returns[["SK_Hynix"] + x_vars].dropna()
    y = data["SK_Hynix"]
    X = add_constant(data[x_vars])

    model = OLS(y, X).fit(cov_type="HC1")  # 异方差稳健标准误

    print(model.summary())
    print(f"\nDurbin-Watson 统计量: {durbin_watson(model.resid):.4f}")
    print("(接近2表示无自相关)")

    # 保存结果
    path = os.path.join(OUTPUT_DIR, "regression_summary.txt")
    with open(path, "w") as f:
        f.write(str(model.summary()))
    print(f"\n回归结果已保存: {path}")

    # --- 分阶段回归: 冲突前 vs 冲突后 ---
    print("\n" + "-" * 60)
    print("分阶段回归: 冲突前 vs 冲突后 (2026-02-28)")
    print("-" * 60)

    crisis_date = pd.Timestamp("2026-02-28")
    if data.index[-1] > crisis_date and data.index[0] < crisis_date:
        for label, subset in [
            ("冲突前", data[data.index < crisis_date]),
            ("冲突后", data[data.index >= crisis_date]),
        ]:
            if len(subset) < 30:
                print(f"\n  {label}: 样本不足 ({len(subset)} 条), 跳过")
                continue
            y_sub = subset["SK_Hynix"]
            X_sub = add_constant(subset[x_vars])
            m = OLS(y_sub, X_sub).fit(cov_type="HC1")
            print(f"\n  --- {label} (N={len(subset)}) ---")
            print(f"  R-squared: {m.rsquared:.4f}")
            print(f"  Adj R-sq:  {m.rsquared_adj:.4f}")
            print("  显著变量 (p<0.05):")
            sig = m.pvalues[m.pvalues < 0.05].drop("const", errors="ignore")
            for var_name, pval in sig.items():
                coef = m.params[var_name]
                print(f"    {var_name:<15} coef={coef:>10.6f}  p={pval:.4f}")
            if sig.empty:
                print("    (无显著变量)")
    else:
        print("  数据未跨越冲突日期, 跳过分阶段分析")

    return model


# ============================================================
# 8. 价格走势可视化
# ============================================================

def plot_price_trends(prices: pd.DataFrame):
    """绘制关键价格走势对比图"""
    fig, axes = plt.subplots(4, 1, figsize=(14, 16), sharex=True)

    # Panel 1: SK Hynix 股价
    if "SK_Hynix" in prices.columns:
        axes[0].plot(prices.index, prices["SK_Hynix"], color="navy", linewidth=1.5)
        axes[0].set_title("SK Hynix (000660.KS) Stock Price", fontsize=12)
        axes[0].set_ylabel("KRW")
        axes[0].axvline(pd.Timestamp("2026-02-28"), color="red", linestyle="--",
                        alpha=0.7, label="Hormuz Blockade")
        axes[0].legend()
        axes[0].grid(alpha=0.3)

    # Panel 2: 原油价格
    oil_vars = [v for v in ["Brent", "WTI"] if v in prices.columns]
    for v in oil_vars:
        axes[1].plot(prices.index, prices[v], label=v, linewidth=1.5)
    axes[1].set_title("Crude Oil Prices", fontsize=12)
    axes[1].set_ylabel("USD/bbl")
    axes[1].axvline(pd.Timestamp("2026-02-28"), color="red", linestyle="--", alpha=0.7)
    axes[1].legend()
    axes[1].grid(alpha=0.3)

    # Panel 3: 天然气价格
    gas_vars = [v for v in ["Henry_Hub", "TTF"] if v in prices.columns]
    for v in gas_vars:
        axes[2].plot(prices.index, prices[v], label=v, linewidth=1.5)
    axes[2].set_title("Natural Gas Prices", fontsize=12)
    axes[2].set_ylabel("Price")
    axes[2].axvline(pd.Timestamp("2026-02-28"), color="red", linestyle="--", alpha=0.7)
    axes[2].legend()
    axes[2].grid(alpha=0.3)

    # Panel 4: USD/KRW 汇率
    if "USD_KRW" in prices.columns:
        axes[3].plot(prices.index, prices["USD_KRW"], color="green", linewidth=1.5)
        axes[3].set_title("USD/KRW Exchange Rate", fontsize=12)
        axes[3].set_ylabel("KRW per USD")
        axes[3].axvline(pd.Timestamp("2026-02-28"), color="red", linestyle="--",
                        alpha=0.7, label="Hormuz Blockade")
        axes[3].legend()
        axes[3].grid(alpha=0.3)

    plt.suptitle(
        "Energy-to-SK Hynix Transmission: Key Price Trends\n"
        "(Red dashed line = Strait of Hormuz blockade, 2026-02-28)",
        fontsize=14, y=1.01,
    )
    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "price_trends.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    print(f"价格走势图已保存: {path}")
    plt.close()


# ============================================================
# 9. 脉冲响应分析 (简化版)
# ============================================================

def lagged_response(returns: pd.DataFrame, max_lag: int = 20):
    """分析能源价格变动后, SK海力士在未来N天的累计响应"""
    if "SK_Hynix" not in returns.columns:
        return

    energy_vars = [v for v in ["Brent", "WTI", "Henry_Hub", "TTF"] if v in returns.columns]
    if not energy_vars:
        return

    print("\n" + "=" * 60)
    print("滞后响应分析")
    print("(能源价格1%冲击后, SK海力士累计收益率变化)")
    print("=" * 60)

    fig, ax = plt.subplots(figsize=(12, 6))

    for var in energy_vars:
        # 找到能源价格大幅波动的日期 (>1标准差)
        threshold = returns[var].std()
        shock_days = returns[returns[var].abs() > threshold].index

        # 计算冲击后的平均累计收益
        cum_responses = []
        for day in shock_days:
            loc = returns.index.get_loc(day)
            if loc + max_lag >= len(returns):
                continue
            sign = np.sign(returns.loc[day, var])
            future = returns["SK_Hynix"].iloc[loc : loc + max_lag + 1].cumsum()
            cum_responses.append(future.values * sign)

        if cum_responses:
            avg_response = np.mean(cum_responses, axis=0) * 100  # 转换为百分比
            ax.plot(range(max_lag + 1), avg_response, label=var, linewidth=2)

    ax.axhline(y=0, color="black", linestyle="--", alpha=0.3)
    ax.set_xlabel("Days After Energy Price Shock")
    ax.set_ylabel("Cumulative SK Hynix Return (%)")
    ax.set_title("Impulse Response: Energy Price Shock -> SK Hynix Returns")
    ax.legend()
    ax.grid(alpha=0.3)
    plt.tight_layout()
    path = os.path.join(OUTPUT_DIR, "impulse_response.png")
    fig.savefig(path, dpi=150)
    print(f"脉冲响应图已保存: {path}")
    plt.close()


# ============================================================
# 10. 主函数
# ============================================================

def main():
    print("=" * 60)
    print("  能源价格 → SK海力士 传导模型分析")
    print("  Energy Price -> SK Hynix Transmission Model")
    print("=" * 60)

    # Step 1: 数据采集
    prices = fetch_data(TICKERS, START_DATE, END_DATE)
    prices.to_csv(os.path.join(OUTPUT_DIR, "raw_prices.csv"))
    print(f"原始价格数据已保存: {OUTPUT_DIR}/raw_prices.csv")

    # Step 2: 计算收益率
    returns = compute_returns(prices)
    returns.to_csv(os.path.join(OUTPUT_DIR, "returns.csv"))

    # Step 3: 相关性分析
    corr = correlation_analysis(returns)
    plot_correlation_heatmap(corr)

    # Step 4: 滚动相关性
    rolling_correlation(returns, window=60)

    # Step 5: Granger 因果检验
    granger_causality(returns, max_lag=10)

    # Step 6: 多元回归
    regression_analysis(returns)

    # Step 7: 价格走势图
    plot_price_trends(prices)

    # Step 8: 脉冲响应
    lagged_response(returns, max_lag=20)

    print("\n" + "=" * 60)
    print("分析完成! 所有结果保存在:", OUTPUT_DIR)
    print("=" * 60)
    print("\n生成的文件:")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
        print(f"  {f:<30} ({size:,} bytes)")


if __name__ == "__main__":
    main()
