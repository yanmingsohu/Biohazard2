import Tool from './tool.js'

export default {
  compile,
};

const EMPTY = '';
let indentation = '';
let addr = 0;


class Mem {
  constructor(buf, pc) {
    if (!pc) throw new Error("bad sub function number");
    this._buf = buf;
    this._pc = pc;
    this._stack = [];
    this.sub_stack = [];
  }

  byte() {
    let d = this._buf.getUint8(this._pc);
    // debug(">", h(this._pc), d);
    this._pc += 1;
    return d;
  }

  char() {
    let d = this._buf.getInt8(this._pc);
    // debug(">", h(this._pc), d);
    this._pc += 1;
    return d;
  }

  ushort() {
    let d = this._buf.getUint16(this._pc, true);
    // debug(">", h(this._pc), d);
    this._pc += 2;
    return d;
  }

  short() {
    let d = this._buf.getInt16(this._pc, true);
    // debug(">", h(this._pc), d);
    this._pc += 2;
    return d;
  }

  ulong() {
    let d = this._buf.getUint32(this._pc, true);
    this._ps += 4;
    return d;
  }

  // 跳过 n 个字节
  s(n) {
    // console.debug("^", h(this._pc), "[", 
    //     new Uint8Array(this._buf.buffer, this._pc, n), "]");
    this._pc += n;
  }

  // 值压入栈
  push(pc) {
    // debug("PUSH", h(this._pc), h(pc));
    this._stack.push(pc);
    indentation += '  ';
    // TODO: 过多的缩进是 bug
    if (indentation.length > 20) {
      throw new Error("many indentation");
    }
  }

  // 弹出的栈值作为 pc 的值
  pop() {
    if (this._stack.length <= 0) 
        throw new Error("POP empty stack");
    let v = this._stack.pop();
    // debug("POP", h(v));
    indentation = indentation.substr(2);
    return v;
  }

  // 弹出的栈值作为 pc 的值
  poppc() {
    this._pc = this.pop();
  }

  // 返回栈顶的值但不弹出
  top() {
    if (this._stack.length <= 0) 
        throw new Error("TOP empty stack");
    return this._stack[this._stack.length-1];
  }

  is_stack_non() {
    return this._stack.length === 0;
  }
}


function debug() {
  let a = [addr, '#', indentation];
  for (let i=0; i<arguments.length; ++i) a.push(arguments[i]);
  Tool.debug.apply(null, a);
}


function h(n) {
  if (n < 0x10) {
    return '0x0'+ n.toString(16);
  } else {
    return '0x'+ n.toString(16);
  }
}


//
// 编译生化危机脚本为 js 脚本, 并返回执行函数
//
function compile(arrbuf) {
  let fun_point = [];
  let first = arrbuf.getUint16(0, true);
  fun_point[0] = first;

  for (let i = 2; i<first; i += 2) {
    fun_point.push(arrbuf.getUint16(i, true));
  }

  console.log("Bio2 Script Func Point:", fun_point);

  return {
    // 启动一个脚本
    run,
    // 脚本数量
    count : fun_point.length,
  };


  //
  // 运行 bio2 脚本
  // game -- 游戏状态对象
  // sub_num -- 脚本编号
  //
  function run(game, sub_num = 0) {
    let mem = new Mem(arrbuf, fun_point[sub_num]);
    mem.funcid = sub_num;
    let pc = 0;
    game.func_ret = undefined;
    indentation = EMPTY;

    while (game.script_running && game.func_ret === undefined) {
      // 指向当前指令的地址
      pc = mem._pc;
      _do(game, mem.byte(), mem, pc);
    }
    debug("EXIT:", game.func_ret);
  }


  //
  // game 游戏对象
  // op 操作码
  // mem 内存模拟
  // oppc 操作码所在的指针
  //
  function _do(game, op, mem, oppc) {
    addr = oppc +"/"+ h(op);
    switch(op) {
      default:
        throw new Error("BAD OP "+ h(op));
        break;

      case 0x00: 
      case 0x1E:
      case 0x1F:
      case 0x20:
        debug('NOP');
        break;

      case 0x01:
        let r = mem.byte();
        debug("Evt_end EXIT", r);
        if (mem.is_stack_non()) {
          game.func_ret = r;
        } else {
          mem.poppc();
        }
        break;

      case 0x02:
        debug("Evt_next"); // wait input?
        if (!game.next_frame()) {
          game.func_ret = 0;
        }
        break;

      case 0x03:
        debug("Evt_chain");
        mem.byte();
        mem.byte();
        mem.byte();
        break;

      case 0x04:
        debug("Evt_exec");
        if (0xFF != mem.byte()) debug("not 0xff");
        if (0x18 != mem.byte()) debug("not 0x18");
        var scd = mem.byte();
        debug('scd num', scd);
        mem.push(mem._pc);
        mem._pc = fun_point[scd];
        break;

      case 0x05:
        debug("Evt_kill");
        mem.byte();
        break;

      case 0x06:
        debug("IF {");
        mem.s(1);
        // 指令记录了块结束的位置
        // CK(0x21) 指令一般在 if/while/for 后面
        // 弹出后应该指向 if 结束指令的下一条指令.
        var end = mem.ushort() + mem._pc;
        mem.push(end);
        debug("end:", end);
        break;

      case 0x07:
        debug("Else {");
        mem.s(1);
        var end = mem.ushort() + oppc;
        if (mem.ck !== false) {
          mem._pc = end;
          debug("skip else", end);
        }
        mem.pop();
        break;

      case 0x08:
        debug("IF }");
        // 块结束必须弹出 if 压入的块长度
        mem.pop();
        mem.s(1);
        break;

      case 0x09:
        debug("pre sleep");
        break;

      case 0x0A:
        var sleeping = mem.byte();
        var count = mem.byte();
        debug("sleep", sleeping, count);
        break;

      case 0x0B:
        debug("Wsleep");
        break;

      case 0x0C:
        debug("Wsleeping");
        break;

      case 0x0D:
        debug("FOR {");
        mem.s(1);
        var size = mem.ushort();
        var count = mem.ushort();
        mem.push(size + mem._pc);
        debug("size", size, 'count', count);
        break;

      case 0x0E:
        debug("FOR }");
        mem.s(1);
        mem.pop();
        break;

      case 0x0F:
        debug("While {");
        var num = mem.s(1);
        mem.push(mem.ushort() + mem._pc);
        break;

      case 0x10:
        debug("While }");
        mem.byte();
        mem.pop();
        break;

      case 0x11:
        debug("DO {");
        var num = mem.byte();
        var size = mem.ushort();
        // mem.push(size + mem._pc);
        debug(num, size);
        break;

      case 0x12:
        debug("do_while }");
        var size = mem.byte();
        var begin = mem._pc - size;
        debug(size, begin);
        // mem.pop();
        break;

      case 0x13:
        debug("Switch {");
        var idx = mem.byte();
        var switch_val = game.getGameVar(idx);
        var end = mem.ushort() + mem._pc;
        mem.push(end);
        mem.push(switch_val);
        debug("switch_val:", idx, '=>', switch_val, '| end:', end);
        break;

      case 0x14:
        mem.s(1);
        var size = mem.ushort();
        var val = mem.ushort();
        var switch_val = mem.top();
        if (val != switch_val) {
          mem._pc = size + mem._pc;
        }
        debug("Case: size/val", size, val, val == switch_val);
        break;

      case 0x15:
        debug("Default:");
        mem.s(1);
        break;

      case 0x16:
        debug("Switch }");
        mem.s(1);
        mem.pop(); // switch_val
        mem.pop(); // size
        break;

      case 0x17:
        debug("GOTO");
        // always 0xFF (0x01 on r304-sub05, only)
        var Ifel_ctr = mem.byte();
        // always 0xFF (0x00 on r500-sub04 and sub07, only)
        var Loop_ctr = mem.byte();
        mem.s(1);
        var offset = mem.short();
        debug(Ifel_ctr, Loop_ctr, offset);
        mem._pc = oppc + offset;
        break;

      case 0x18:
        var scd = mem.byte();
        debug("CALL-SUB", scd);
        // mem.sub_stack.push({ s: mem._stack.length, p: mem._pc });
        // mem._pc = fun_point[scd];
        mem.push(mem._pc);
        mem._pc = fun_point[scd];
        break;

      case 0x19:
        debug("END-SUB");
        mem.s(1);
        mem.poppc();
        break;

      case 0x1A:
        debug("Break");
        mem.s(1);
        // mem.poppc();
        break;

      case 0x1B:
        debug("FORM2");
        mem.byte();
        mem.ushort();
        mem.ushort();
        break;

      case 0x1C:
        debug("Break_point");
        break;

      case 0x1D:
        debug("Work_copy");
        mem.byte();
        mem.byte();
        mem.byte();
        break;

      case 0x21:
        debug("Bit test(Ck)");
        var arr = mem.byte();
        var num = mem.byte();
        var val = mem.byte();
        debug(arr, num, val);
        
        if (val != game.get_bitarr(arr, num)) {
          mem.ck = false;
          mem.poppc();
        } else {
          mem.ck = true;
        }
        break;

      case 0x22:
        debug("Bit chg");
        var arr = mem.byte();
        var num = mem.byte();
        var opchg = mem.byte();
        switch (opchg) {
          case 0x00: game.set_bitarr(arr, num, 0); break;
          case 0x01: game.set_bitarr(arr, num, 1); break;
          case 0x07: game.reverse(arr, num); break;
        }
        console.log(arr, num, opchg);
        break;

      case 0x23:
        debug("Compare");
        mem.byte();
        mem.byte();
        mem.byte();
        break;

      case 0x24:
        debug("Save");
        mem.byte();
        mem.short();
        break;

      case 0x25:
        debug("Copy");
        mem.byte();
        mem.byte();
        break;

      case 0x26:
        debug("Calc");
        mem.s(1);
        var op = mem.byte();
        var i = mem.byte();
        var v = mem.short();
        var a = game.getGameVar(i);
        var r = game.calc(op, a, v);
        game.setGameVar(i, r);
        debug(op, i, v, a, r);
        break;

      case 0x27:
        debug("Calc2");
        var op = mem.byte();
        var i = mem.byte();
        var v = mem.byte();
        var a = game.getGameVar(i);
        var r = game.calc(op, a, v);
        game.setGameVar(i, r);
        debug(op, i, v, a, r);
        break;

      case 0x28:
        debug("Sce_rnd");
        break;

      case 0x29:
        debug("Cut_chg");
        mem.byte();
        break;

      case 0x2A:
        debug("Cut_old");
        break;

      case 0x2B:
        debug("Message_on");
        mem.s(1);
        mem.byte();
        mem.s(1);
        mem.s(1);
        mem.s(1);
        break;

      case 0x2C:
        // 障碍物，检查物体时的信息，死尸，火, 触发的事件
        debug("Aot_set 不可拾取的物体");
        var npo = {};
        npo.id = mem.byte();
        npo.type = mem.byte();
        npo.u0 = mem.byte();
        npo.u1 = mem.byte();
        npo.u2 = mem.byte();
        npo.x = mem.short();
        npo.y = mem.short();
        npo.w = mem.short();
        npo.h = mem.short();
        npo.ua = mem.ushort();
        npo.ub = mem.ushort();
        npo.uc = mem.ushort();
        debug(npo);
        Tool.xywhBindRange(npo);
        game.aot_set(npo);
        break;

      case 0x2D:
        debug("Obj_model_set");
        var id = mem.byte();
        mem.s(18*2);
        break;

      case 0x2E:
        debug("Work_set");
        var type = mem.byte();
        var aot = mem.char();
        debug(type, aot);
        game.work = game.object_arr[aot];
        game.worktype = type;
        break;

      case 0x2F:
        debug("Speed_set");
        var component = mem.byte();
        var value = mem.short();
        break;

      case 0x30:
        debug("Add_speed");
        break;

      case 0x31:
        debug("Add_aspeed");
        break;

      case 0x32:
        debug("Pos_set");
        mem.s(7);
        break;

      case 0x33:
        debug("Dir_set")
        mem.s(7);
        break;

      case 0x34:
        debug("Member_set");
        var operation = mem.byte();
        var value = mem.short();
        debug('op:', operation, 'v:', value);
        break;

      case 0x35:
        debug("Member_set2");
        var id = mem.byte();
        var varw = mem.byte();
        debug(id, varw);
        break;

      case 0x36:
        debug("Se_on");
        mem.s(11);
        break;

      case 0x37:
        debug("Sca_id_set");
        mem.s(3);
        break;

      case 0x38:
        debug("Sca_id_set");
        var id = mem.byte();
        var flag = mem.byte();
        debug(id, flag);
        break;

      case 0x39:
        debug("Dir_ck");
        mem.s(8);
        break;

      case 0x3A:
        debug("Sce_espr_on");
        mem.s(15);
        break;

      case 0x3B:
        debug("Door_aot_set 在地图上定义一个门");
        var door = {};
        door.id = mem.byte();
        mem.s(4);
        door.x = mem.short();
        door.y = mem.short();
        door.w = mem.short();
        door.h = mem.short();
        // Position and direction of player after door entered
        door.next_x = mem.short(); 
        door.next_y = mem.short();
        door.next_z = mem.short();
        door.next_dir = mem.short();
        // Stage,room,camera after door entered
        door.stage = mem.byte(); 
        door.room = mem.byte();
        door.camera = mem.byte();
        mem.s(1);
        door.type = mem.byte();
        door.lock = mem.byte();
        mem.s(1);
        door.locked = mem.byte();
        door.key = mem.byte();
        mem.s(1);
        debug((door));
        game.setDoor(door);
        break;

      case 0x3C:
        debug('Cut_auto');
        var screen = mem.byte();
        debug('screen', screen);
        break;

      case 0x3D:
        debug('Member_copy');
        var varw = mem.byte();
        var id = mem.byte();
        debug(varw, id);
        break;

      case 0x3E:
        debug("Member_cmp");
        mem.s(2);
        var compare = mem.byte();
        var value = mem.short();
        debug(compare, value);
        break;

      case 0x3F:
        debug('Plc_motion');
        mem.s(3);
        break;

      case 0x40:
        debug('Plc_dest');
        mem.s(7);
        break;

      case 0x41:
        debug("Plc_neck");
        mem.s(9);
        break;

      case 0x42:
        debug("Plc_ret");
        break;

      case 0x43:
        debug("Plc_flg");
        mem.s(3);
        break;

      case 0x44:
        debug("Sce_em_set 设置一个敌人");
        mem.s(1);
        var zb = {};
        // entity index in internal array
        zb.id = mem.byte();
        // 0x1f = peek a random zombi model
				// else use this value for em0XX.emd filename
        zb.model = mem.byte();
        zb.state = mem.byte();
        mem.s(2);
        zb.sound_bank = mem.byte();
        zb.texture = mem.byte();
        /* entity index in internal bit array */
				/* seems to be unique for all entities of the game */
				/* to know which ones have been killed, and must */
				/* not be re-added to room when player come back */
        zb.killed_id = mem.byte();
        /* position and direction of entity */
        zb.x = mem.short();
        zb.y = mem.short();
        zb.z = mem.short();
        zb.dir = mem.short();
        mem.s(4);
        debug((zb));
        game.addEnemy(zb);
        break;

      case 0x45:
        debug("Col_chg_set");
        mem.s(4);
        break;

      case 0x46:
        debug("Aot_reset");
        let obj = {};
        obj.id = mem.byte();
        obj.uk0 = mem.byte();
        obj.uk1 = mem.byte();
        obj.uk2 = mem.ushort();
        obj.uk3 = mem.ushort();
        obj.uk4 = mem.ushort();
        debug(obj);
        break;

      case 0x47:
        debug("Aot_on");
        var id = mem.byte();
        break;

      case 0x48:
        debug("Super_set");
        mem.s(15);
        break;

      case 0x49:
        debug("Super_reset");
        mem.s(7);
        break;

      case 0x4A:
        debug("Plc_gun");
        mem.s(1);
        break;

      case 0x4B:
        debug("Cut_replace");
        var cam1 = mem.byte();
        var cam2 = mem.byte();
        break;

      case 0x4C:
        debug("Sce_espr_kill");
        mem.s(4);
        break;

      case 0x4D:
        debug("0x4D ?Door_model_set");
        mem.s(21);
        break;

      case 0x4E:
        debug("Item_aot_set");
        var item = {};
        item.id = mem.byte();
        // item.uk0 = mem.ulong();
        item.sce = mem.byte();
        item.sat = mem.byte();
        item.floor = mem.byte();
        item.super = mem.byte();
        item.x = mem.short();
        item.y = mem.short();
        item.w = mem.short();
        item.h = mem.short();
        // 0x07: flower? typewrite ribbon? 0x14: ammo for gun
        item.itemid = mem.ushort(); 
        /* For ammo: number of bullets/shells/etc */
				/* For a key: number of times it can be used before the 'Discard key?' message */		
        item.amount = mem.ushort();
        // 物品拾起后不再生成, 这些信息保存在
        item.array08_idx = mem.ushort();
        // item.uk1 = mem.ushort();
        item.md1 = mem.byte();
        item.act = mem.byte();
        debug(item);
        game.aot_set(item);
        break;

      case 0x4F:
        debug("Sce_key_ck");
        mem.s(3);
        break;

      case 0x50:
        debug("Sce_trg_ck");
        mem.s(3);
        break;

      case 0x51:
        debug("Sce_bgm_control");
        var bgm = {};
        // 0:Main, 1:sub0, 2:sub1
        bgm.id = mem.byte();
        // 0:nop, 1:start, 2:stop, 3:restart, 4:pause, 5:fadeout
        bgm.op = mem.byte();
        // 0:MAIN_VOL, 1:PROG0_VOL, 2:PROG1_VOL, 3:PROG2_VOL
        bgm.type = mem.byte();
        bgm.l = mem.byte();
        bgm.r = mem.byte();
        debug(bgm);
        break;

      case 0x52:
        debug("Sce_espr_control");
        mem.s(5);
        break;

      case 0x53:
        debug("Sce_fade_set");
        mem.s(5);
        break;

      case 0x54:
        debug("Sce_espr3d_on");
        mem.s(21);
        break;

      case 0x55:
        debug("Member_calc");
        mem.s(5);
        break;

      case 0x56:
        debug("Member_calc2");
        mem.s(3);
        break;

      case 0x57:
        debug("Sce_bgmtbl_set");
        mem.s(7);
        break;

      case 0x58:
        debug("Plc_rot");
        mem.s(3);
        break;

      case 0x59:
        debug("Xa_on");
        mem.s(3);
        break;

      case 0x5A:
        debug("Weapon_chg");
        var item = mem.byte();
        break;

      case 0x5B:
        debug("Plc_cnt");
        mem.s(1);
        break;
    
      case 0x5C:
        debug("Sce_shake_on")
        mem.s(2);
        break;

      case 0x5D:
        debug("Mizu_div_set");
        mem.s(1);
        break;

      case 0x5E:
        debug("Keep_Item_ck");
        mem.s(1);
        break;

      case 0x5F:
        debug('Xa_vol');
        mem.s(1);
        break;

      case 0x60:
        debug("Kage_set");
        var kage = {};
        kage.work = mem.byte();
        kage.id = mem.char();
        kage.d0 = mem.byte();
        kage.d1 = mem.byte();
        kage.d2 = mem.byte();
        kage.da = mem.ushort();
        kage.db = mem.ushort();
        kage.dc = mem.ushort();
        kage.dd = mem.ushort();
        debug(kage);
        break;

      case 0x61:
        debug("Cut_be_set");
        mem.s(3);
        break;

      case 0x62:
        debug("Sce_Item_lost");
        var item = mem.byte();
        break;

      case 0x63:
        debug("Plc_gun_eff");
        break;

      case 0x64:
        debug("Sce_espr_on2");
        mem.s(15);
        break;

      case 0x65:
        debug("Sce_espr_kill2");
        mem.s(1);
        break;

      case 0x66:
        debug("Plc_stop");
        break;

      case 0x67:
        debug("Aot_set_4p, 用4个点定义一个范围, 玩家不能离开");
        var wall = {};
        wall.id = mem.byte();
        wall.sce = mem.byte(); // sce 就是 type
        wall.sat = mem.byte();
        wall.floor = mem.byte();
        wall.super = mem.byte();
        wall.x1 = mem.short();
        wall.y1 = mem.short();
        wall.x2 = mem.short();
        wall.y2 = mem.short();
        wall.x3 = mem.short();
        wall.y3 = mem.short();
        wall.x4 = mem.short();
        wall.y4 = mem.short();
        wall.uk0 = mem.ushort();
        wall.uk1 = mem.ushort();
        wall.uk2 = mem.ushort();
        debug("Wall", (wall));
        game.aot_set(wall);
        break;

      case 0x68:
        debug("Door_aot_set_4p");
        mem.s(39);
        break;

      case 0x69:
        debug("Item_aot_set_4p");
        mem.s(29);
        break;

      case 0x6A:
        debug("Light_pos_set");
        mem.s(1);
        var light = mem.byte();
        var param = mem.byte(); // 11,12,13 for x,y,z
        var value = mem.short();
        break;

      case 0x6B:
        debug("Light_kido_set");
        var light = mem.byte();
        var bright = mem.short();
        break;

      case 0x6C:
        debug("Rbj_reset");
        mem.s(21);
        break;

      case 0x6D:
        debug("Sce_scr_move");
        mem.s(1);
        var y = mem.short();
        break;

      case 0x6E:
        debug("Parts_set");
        mem.s(5);
        break;

      case 0x6F:
        debug("Movie_on");
        var id = mem.byte();
        break;

      case 0x70:
        debug("Splc_ret");
        break;

      case 0x71:
        debug("Splc_sce");
        break;

      case 0x72:
        debug("Super_on");
        mem.s(15);
        break;

      case 0x73:
        debug("Mirror_set");
        mem.s(7);
        break;

      case 0x74:
        debug("Sce_fade_adjust");
        mem.s(4);
        break;

      case 0x75:
        debug("Sce_espr3d_on2");
        mem.s(21);
        break;

      case 0x76:
        debug("Sce_Item_get");
        var id = mem.byte(); //Number of gitemXX.adt file to load
        var amount = mem.byte();
        break;

      case 0x77:
        debug("Sce_line_start");
        mem.s(3);
        break;

      case 0x78:
        debug('Sce_line_main');
        mem.s(5);
        break;

      case 0x79:
        debug('Sce_line_end');
        break;

      case 0x7A:
        debug('Sce_parts_bomb');
        mem.s(15);
        break;

      case 0x7B:
        debug('Sce_parts_down');
        mem.s(15);
        break;

      case 0x7C:
        debug('Light_color_set');
        var light = mem.byte();
        var r = mem.byte();
        var g = mem.byte();
        var b = mem.byte();
        mem.s(1);
        break;

      case 0x7D:
        debug('Light_pos_set2');
        var camera = mem.byte();
        var light = mem.byte();
        var param = mem.byte(); // 11,12,13 for x,y,z 
        var value = mem.short();
        break;

      case 0x7E:
        debug('Light_kido_set2');
        mem.s(1);
        var camera = mem.byte();
        var light = mem.byte();
        var bright = mem.short();
        break;

      case 0x7F:
        debug('Light_color_set2');
        var camera = mem.byte();
        var light = mem.byte();
        var r = mem.byte();
        var g = mem.byte();
        var b = mem.byte();
        break;

      case 0x80:
        debug('Se_vol');
        var v = mem.byte();
        break;

      case 0x81:
        debug("?x81!!!!!!!!");
        break;

      case 0x82:
        debug("?x82");
        mem.s(2);
        break;

      case 0x83:
        debug("?x83");
        break;

      case 0x84:
        debug("?x84");
        mem.s(1);
        break;

      case 0x85:
        debug("?x85");
        mem.s(5);
        break;

      case 0x86:
        debug('Poison_ck');
        break;

      case 0x87:
        debug('Poison_clr');
        break;

      case 0x88:
        debug('Sce_Item_ck_Lost');
        mem.s(2);
        break;

      case 0x89:
        debug('?x89');
        break;

      case 0x8A:
      case 0x8B:
        debug("NOP6");
        mem.s(5);
        break;

      case 0x8C:
        debug("NOP8");
        mem.s(7);
        break;

      case 0x8D:
        debug("?x8D");
        mem.s(23);
        break;
      
      case 0x8E:
        debug("?x8E");
        mem.s(23);
        break;
    }
  }
}