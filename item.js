const gun = [
  // id编号, name名称, scope伤害范围, mul多弹道, clip弹夹容量, 
  // shut_se射击音效, loading_se换弹夹音效, bullet_m子弹贴图
  { id:7, name:'散弹枪', scope:12000, mul:1, clip:6, shut_se:null, 
    loading_se:null, bullet_m:null, hurt:8 },
];

export default {
  getGun,
};


function getGun(id) {
  for (let i=0; i<gun.length; ++i) {
    if (gun[i].id == id) {
      return gun[i];
    }
  }
}