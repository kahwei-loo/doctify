/**
 * 测量 Document Details 页面的信息密度
 *
 * 在浏览器控制台运行此脚本来收集数据
 * 使用方法：
 * 1. 打开 Document Details 页面
 * 2. F12 打开控制台
 * 3. 复制粘贴此脚本
 * 4. 按 Enter 运行
 */

(function measureViewportDensity() {
  console.log('📊 开始测量信息密度...\n');

  // 1. 视口高度
  const viewportHeight = window.innerHeight;
  console.log(`🖥️  视口高度: ${viewportHeight}px`);

  // 2. 可见字段数量
  const businessFields = document.querySelectorAll('[class*="BusinessField"], [class*="border-b border-r"]');
  const visibleFields = Array.from(businessFields).filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.top < viewportHeight;
  });
  console.log(`📋 可见字段数: ${visibleFields.length} / ${businessFields.length}`);

  // 3. 字段平均高度
  if (visibleFields.length > 0) {
    const fieldHeights = visibleFields.map(el => el.offsetHeight);
    const avgFieldHeight = fieldHeights.reduce((a, b) => a + b, 0) / fieldHeights.length;
    console.log(`📏 字段平均高度: ${avgFieldHeight.toFixed(1)}px`);
  }

  // 4. 是否需要滚动
  const contentHeight = document.querySelector('[class*="overflow-auto"]')?.scrollHeight || 0;
  const needsScroll = contentHeight > viewportHeight;
  console.log(`📜 需要滚动: ${needsScroll ? '是' : '否'} (内容高度: ${contentHeight}px)`);

  // 5. Line Items 标题栏高度
  const lineItemsHeader = document.querySelector('button:has([class*="Line Items"])');
  if (lineItemsHeader) {
    console.log(`📦 Line Items 标题栏高度: ${lineItemsHeader.offsetHeight}px`);
  }

  // 6. 货币符号检查
  const currencyElements = Array.from(document.querySelectorAll('*')).filter(el =>
    /RM|MYR|\$|USD/.test(el.textContent) && el.children.length === 0
  );
  if (currencyElements.length > 0) {
    const currencies = [...new Set(currencyElements.map(el => {
      const match = el.textContent.match(/(RM|MYR|\$|USD)\s*[\d,]+/);
      return match ? match[1] : null;
    }).filter(Boolean))];
    console.log(`💰 检测到的货币符号: ${currencies.join(', ')}`);
  }

  // 7. JSON 视图检查
  const jsonTab = document.querySelector('[value="json"]');
  if (jsonTab) {
    console.log(`📄 JSON 标签存在: 是`);
  }

  // 8. 生成测试报告
  console.log('\n📊 测试数据收集：');
  console.log('```json');
  const report = {
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: viewportHeight
    },
    fields: {
      total: businessFields.length,
      visible: visibleFields.length,
      visibilityRatio: (visibleFields.length / businessFields.length * 100).toFixed(1) + '%'
    },
    scrollRequired: needsScroll,
    contentHeight: contentHeight,
    lineItemsHeaderHeight: lineItemsHeader?.offsetHeight || 'N/A'
  };
  console.log(JSON.stringify(report, null, 2));
  console.log('```');

  console.log('\n✅ 测量完成！请复制上面的 JSON 数据到测试记录中。');
})();
