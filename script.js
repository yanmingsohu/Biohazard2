import Tool from './tool.js'

export default {
  compile,
};

const EMPTY = '';
const h = Tool.h4;
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

  // 返回栈顶的值但不弹出, i 是栈顶向栈底的偏移
  top(i) {
    if (this._stack.length <= 0)  {
      throw new Error("TOP empty stack");
    }
    let off = this._stack.length - 1 - (i || 0);
    if (off < 0) {
      throw new Error("stack index out bound");
    }
    return this._stack[off];
  }

  is_stack_non() {
    return this._stack.length === 0;
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
    // 创建一个脚本上下文, 用于单步执行脚本
    createContext,
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
      if (isNaN(pc)) {
        throw new Error("script error");
      }
      _do(game, mem.byte(), mem, pc);
    }
    debug("EXIT:", game.func_ret);
  }


  //
  // 单步运行脚本, 返回一个运行函数
  //
  function createContext(game, sub_num = 0) {
    let mem = new Mem(arrbuf, fun_point[sub_num]);
    mem.funcid = sub_num;
    let pc = 0;
    game.func_ret = undefined;
    indentation = EMPTY;

    const context = {
      frame,
      callSub,
    };
    return context;


    function frame(u) {
      if (game.func_ret !== undefined) {
        return 1;
      }
      if (game.waittime - u > 0) {
        game.waittime -= u;
        if (game.waittime < 0) game.waittime = 0;
        return 1;
      }
      pc = mem._pc;
      _do(game, mem.byte(), mem, pc);
      return 2;
    };


    function callSub(subnum) {
      if (!mem.is_stack_non()) mem.push(mem._pc);
      if (subnum < 0 || subnum >= fun_point.length || isNaN(subnum)) {
        throw new Error("Outof bound sub array "+ subnum);
      }
      mem._pc = fun_point[subnum];
      game.func_ret = undefined;
    }
  }


  //
  // game 游戏对象
  // op 操作码
  // mem 内存模拟
  // oppc 操作码所在的指针
  //
  function _do(game, op, mem, oppc) {
    addr = h(oppc) +"/"+ Tool.h2(op);
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
        break;

      case 0x03:
        debug("Evt_chain");
        var id = mem.byte();
        debug(id);
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
        game.waittime = 0;
        // mem.s(1);
        break;

      case 0x0A:
        var sleeping = mem.byte();
        debug("sleep", sleeping);
        game.waittime = sleeping / 30;
        break;

      case 0x0B:
        debug("Wsleep");
        break;

      case 0x0C:
        debug("Wsleeping");
        // mem.wsec 必须是未来的结束时间
        let wsec = mem.wsec - (Date.now()/1000);
        debug("sec", wsec);
        if (wsec > 0) {
          game.waittime = wsec;
        }
        break;

      case 0x0D:
        debug("FOR {");
        mem.s(1);
        var size = mem.ushort();
        var count = mem.ushort();
        if (count == 0) {
          // 直接跳到 for 循环结束指令的下一条指令
          mem._pc = size + mem._pc;
        } else {
          mem.push(mem._pc);
          mem.push(count);
        }
        debug("size", size, 'count', count);
        break;

      case 0x0E:
        debug("FOR }");
        mem.s(1);
        var count = mem.pop();
        if (--count <= 0) {
          mem.pop();
        } else {
          mem._pc = mem.top();
          mem.push(count);
        }
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
        debug(Ifel_ctr, Loop_ctr, offset, oppc + offset);
        // mem._pc = oppc + offset;
        // indentation = '';
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
        var src = mem.byte();
        var dst = mem.byte();
        var type = mem.byte();
        debug(src, dst, type ? 'short': 'byte');
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
        debug(arr, num, opchg);
        break;

      case 0x23:
        debug("Compare");
        mem.s(1);
        var flag = mem.byte();
        var op = mem.byte();
        var v = mem.short();
        debug(flag, op, v);
        break;

      case 0x24:
        debug("Save");
        var dst = mem.byte();
        var src = mem.short();
        debug(dst, src);
        break;

      case 0x25:
        debug("Copy");
        var dst = mem.byte();
        var src = mem.byte();
        debug(dst, src);
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
        debug("rnd");
        break;

      case 0x29:
        debug("Cut_chg");
        game.cut_chg(mem.byte());
        // game.next_frame();
        break;

      case 0x2A:
        debug("Cut_old");
        game.cut_restore();
        break;

      case 0x2B:
        debug("Message_on");
        mem.s(1);
        var d0 = mem.byte();
        var d1 = mem.byte();
        var d2 = mem.ushort();
        debug(d0, d1, d2);
        game.show_message(d0, d1, d2);
        break;

      case 0x2C:
        // 障碍物，检查物体时的信息，死尸，火, 触发的事件
        debug("Aot_set 不可拾取的物体");
        var npo = {};
        npo.id = mem.byte();
        npo.type = mem.byte();
        npo.sat = mem.byte();
        npo.nfloor = mem.byte();
        npo.super = mem.byte();
        npo.x = mem.short();
        npo.y = mem.short();
        npo.w = mem.short();
        npo.h = mem.short();
        npo.d0 = mem.byte();
        npo.d1 = mem.byte();
        npo.d2 = mem.byte();
        npo.d3 = mem.byte();
        npo.d4 = mem.byte();
        npo.d5 = mem.byte();
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
        game.work = game.get_game_object(type, aot);
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
        mem.s(1);
        var x = mem.short();
        var y = mem.short();
        var z = mem.short();
        debug(x, y, z);
        // game.pos_set(x, y, z);
        game.work.setPos(x, y, z);
        break;

      case 0x33:
        debug("Dir_set");
        mem.s(1);
        var x = mem.short();
        var y = mem.short();
        var z = mem.short();
        game.work.lookAt(x, y, z);
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
        var se = {};
        se.vab = mem.byte();
        se.edt0 = mem.byte();
        se.edt1 = mem.byte();
        se.data0 = mem.byte();
        se.data1 = mem.byte();
        se.x = mem.short();
        se.y = mem.short();
        se.z = mem.short();
        debug(se);
        mem.wsec = (Date.now()/1000) + game.play_se(se.data1, se.edt0);
        break;

      case 0x37:
        debug("Sca_id_set");
        mem.s(3);
        break;

      case 0x38:
        debug("floor_flag_set");
        var id = mem.byte();
        var flag = mem.byte();
        debug(id, flag);
        break;

      case 0x39:
        debug("Dir_ck");
        mem.s(8);
        break;

      case 0x3A:
        debug("espr_on");
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
        var on = mem.byte();
        debug(on ? 'on': 'off');
        game.cut_auto(on);
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
        var type = mem.byte();
        var idx  = mem.byte();
        var flag = mem.byte();
        debug('f', flag, 't', type, 'i', idx);
        game.work.setAnim(flag, type, idx);
        break;

      case 0x40:
        debug('Plc_dest ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
        mem.s(1);
        var flag = mem.byte();
        var room = mem.byte();
        var x = mem.short();
        var z = mem.short();
        debug(flag, room, "xz:", x, z);
        if ((flag & 0x10) || (flag & 0x08)) { // 相对位置 0x09
          // game.pos_set(x, 0, z);
        } else {
          game.work.moveTo(x, 0, z);
        }
        break;

      case 0x41:
        debug("Plc_neck");
        var neck = {};
        neck.op = mem.byte();
        neck.x = mem.short();
        neck.y = mem.short();
        neck.z = mem.short();
        neck.spx = mem.byte();
        neck.spz = mem.byte();
        debug(neck);
        game.work.turnAround(neck);
        break;

      case 0x42:
        debug("Plc_ret");
        break;

      case 0x43:
        debug("Plc_flg");
        var type = mem.byte();
        var flag = mem.ushort();
        debug(type, flag);
        break;

      case 0x44:
        debug("em_set 设置一个敌人");
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
        debug("espr_kill");
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
        debug("key_ck");
        mem.s(3);
        break;

      case 0x50:
        debug("trg_ck");
        mem.s(3);
        break;

      case 0x51:
        debug("bgm_control");
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
        debug("espr_control");
        mem.s(5);
        break;

      case 0x53:
        debug("fade_set");
        mem.s(5);
        break;

      case 0x54:
        debug("espr3d_on");
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
        debug("bgmtbl_set");
        mem.s(1);
        var bgm = {};
        bgm.state = mem.byte();
        bgm.room = mem.byte();
        bgm.d1 = mem.ushort();
        bgm.d2 = mem.ushort();
        debug(bgm,'');
        break;

      case 0x58:
        debug("Plc_rot *********************************************");
        mem.s(3);
        break;

      case 0x59:
        debug("Xa_on");
        mem.s(1);
        var se = mem.byte();
        var rl = mem.byte();
        debug(se, rl);
        mem.wsec = (Date.now()/1000) + game.play_voice(se, rl);
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
        debug("shake_on")
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
        debug("Item_lost");
        var item = mem.byte();
        break;

      case 0x63:
        debug("Plc_gun_eff");
        break;

      case 0x64:
        debug("espr_on2");
        mem.s(15);
        break;

      case 0x65:
        debug("espr_kill2");
        mem.s(1);
        break;

      case 0x66:
        debug("Plc_stop");
        break;

      case 0x67:
        debug("Aot_set_4p"); 
        var aot = {};
        aot.id = mem.byte();
        aot.sce = mem.byte(); // sce 就是 type
        aot.sat = mem.byte();
        aot.floor = mem.byte();
        aot.super = mem.byte();
        aot.x1 = mem.short();
        aot.y1 = mem.short();
        aot.x2 = mem.short();
        aot.y2 = mem.short();
        aot.x3 = mem.short();
        aot.y3 = mem.short();
        aot.x4 = mem.short();
        aot.y4 = mem.short();
        aot.d0 = mem.byte();
        aot.d1 = mem.byte();
        aot.d2 = mem.byte();
        aot.d3 = mem.byte();
        aot.d4 = mem.byte();
        aot.d5 = mem.byte();
        debug(aot);
        game.aot_set(aot);
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
        debug("scr_move");
        mem.s(1);
        var y = mem.short();
        debug(y);
        break;

      case 0x6E:
        debug("Parts_set");
        mem.s(1);
        var id = mem.char();
        var type = mem.char();
        var value = mem.short();
        debug(id, type, value);
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
        debug("fade_adjust");
        mem.s(4);
        break;

      case 0x75:
        debug("espr3d_on2");
        mem.s(21);
        break;

      case 0x76:
        debug("Item_get");
        var id = mem.byte(); //Number of gitemXX.adt file to load
        var amount = mem.byte();
        break;

      case 0x77:
        debug("line_start");
        mem.s(3);
        break;

      case 0x78:
        debug('line_main');
        mem.s(5);
        break;

      case 0x79:
        debug('line_end');
        break;

      case 0x7A:
        debug('parts_bomb');
        mem.s(15);
        break;

      case 0x7B:
        debug('parts_down');
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
        debug(v);
        break;

      case 0x81:
        debug("Item_cmp");
        break;

      case 0x82:
        debug("espr_task");
        mem.s(2);
        break;

      case 0x83:
        debug("Plc_heal");
        break;

      case 0x84:
        debug("St_map_hint");
        mem.s(1);
        break;

      case 0x85:
        debug("em_pos_ck");
        mem.s(5);
        break;

      case 0x86:
        debug('Poison_ck');
        break;

      case 0x87:
        debug('Poison_clr');
        break;

      case 0x88:
        debug('Item_ck_Lost');
        mem.s(2);
        break;

      case 0x89:
        debug('Evt_next2');
        break;

      case 0x8A:
        debug('Vib_set0');
        mem.s(1);
        var d0 = mem.ushort();
        var d1 = mem.ushort();
        debug(d0, d1);
        break;

      case 0x8B:
        debug("Vib_set1");
        var id = mem.byte();
        var d0 = mem.ushort();
        var d1 = mem.ushort();
        debug(id, d0, d1);
        break;

      case 0x8C:
        debug("Vib_fade_set");
        mem.s(7);
        break;

      case 0x8D:
        debug("Item_aot_set2");
        mem.s(23);
        break;
      
      case 0x8E:
        debug("em_set2");
        mem.s(23);
        break;
    }
  }
}


function debug() {
  let a = [addr, '#', indentation];
  for (let i=0; i<arguments.length; ++i) a.push(arguments[i]);
  Tool.debug.apply(null, a);
}
