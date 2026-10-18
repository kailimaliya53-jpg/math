<template>
  <header>
    <span class="title">程序设置</span>
    <span class="sub-title">Primary School Mathematics 小学数学口算题</span>
    <a class="home-link" href="../" title="返回数学小教室主页">🏠 主页</a>
  </header>
</template>

<script setup>
</script>

<style lang="scss" scoped>
header {
  color: #000000d9;
  line-height: 64px;
  border-bottom: 1px solid rgb(235, 237, 240);

  .title {
    margin-right: 12px;
    font-size: 20px;
    font-weight: 600;
  }

  .sub-title {
    color: #00000073;
    font-size: 14px;
  }

  .home-link {
    float: right;
    font-size: 14px;
    color: #00000073;
    text-decoration: none;
  }

  .home-link:hover {
    color: #fa8c16;
  }
}

@media (max-width: 640px) {
  .sub-title {
    display: none;
  }
}
</style>