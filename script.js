export default {
  compile,
};


class Mem {
  constructor(buf, pc) {
    if (!pc) throw new Error("bad sub function number");
    this._buf = buf;
    this._pc = pc;
    this._stack = [];
  }

  byte() {
    let d = this._buf.getUint8(this._pc);
    debug(">", h(this._pc), d);
    this._pc += 1;
    return d;
  }

  ushort() {
    let d = this._buf.getUint16(this._pc, true);
    debug(">", h(this._pc), d);
    this._pc += 2;
    return d;
  }

  short() {
    let d = this._buf.getInt16(this._pc, true);
    debug(">", h(this._pc), d);
    this._pc += 2;
    return d;
  }

  // 跳过 n 个字节
  s(n) {
    console.debug("^", h(this._pc), "[", 
        new Uint8Array(this._buf.buffer, this._pc, n), "]");
    this._pc += n;
  }

  // 将当前 pc + length 压入栈中
  // 必须在指令的第一个操作前压入
  push(pc) {
    debug("PUSH", h(this._pc), h(pc));
    this._stack.push(pc);
  }

  // 弹出的栈值作为 pc 的值
  pop() {
    this._pc = this._stack.pop();
    debug("POP", h(this._pc));
  }
}


function debug() {
  console.debug.apply(console, arguments);
}


function h(n) {
  return '0x'+ n.toString(16);
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

  console.log("Func Point:", fun_point);

  return {
    run,
  };


  //
  // 运行 bio2 脚本
  // game -- 游戏状态对象
  // sub_num -- 脚本编号
  //
  function run(game, sub_num = 0) {
    let mem = new Mem(arrbuf, fun_point[sub_num]);
    let pc = 0;
    while (undefined === game.func_ret) {
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
        debug("Evt_end exit and ret");
        game.func_ret = mem.byte();
        break;

      case 0x02:
        debug("Evt_next wait input");
        break;

      case 0x03:
        debug("Evt_chain");
        mem.byte();
        mem.byte();
        mem.byte();
        break;

      case 0x04:
        debug("Evt_exec");
        mem.byte();
        mem.byte();
        mem.byte();
        break;

      case 0x05:
        debug("Evt_kill");
        mem.byte();
        break;

      case 0x06:
        debug("IF {");
        mem.s(1);
        mem.push(mem.ushort() + oppc);
        break;

      case 0x07:
        debug("Else {");
        mem.s(1);
        mem.push(mem.ushort() + oppc);
        if (mem.ck !== false) {
          mem.pop();
        }
        break;

      case 0x08:
        debug("IF }");
        mem.pop();
        break;

      case 0x09:
        debug("pre sleep");
        break;

      case 0x0A:
        debug("sleep");
        mem.byte();
        mem.byte();
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
        mem.ushort();
        mem.ushort();
        break;

      case 0x0E:
        debug("FOR }");
        mem.s(1);
        break;

      case 0x0F:
        debug("While {");
        mem.s(1);
        mem.ushort();
        break;

      case 0x10:
        debug("While }");
        mem.byte();
        break;

      case 0x11:
        debug("DO {");
        mem.s(1);
        mem.ushort();
        break;

      case 0x12:
        debug("DO }");
        mem.byte();
        break;

      case 0x13:
        debug("Switch {");
        mem.byte();
        mem.ushort();
        break;

      case 0x14:
        debug("Case:");
        mem.s(1);
        mem.ushort();
        mem.ushort();
        break;

      case 0x15:
        debug("Default:");
        mem.s(1);
        break;

      case 0x16:
        debug("Switch }");
        mem.s(1);
        break;

      case 0x17:
        debug("GOTO");
        mem.s(1);
        mem.s(1);
        mem.s(1);
        mem.short();
        break;

      case 0x18:
        debug("CALL-SUB");
        var event = mem.byte();
        console.log(event);
        break;

      case 0x19:
        debug("END-SUB");
        mem.s(1);
        break;

      case 0x1A:
        debug("Break");
        // mem.s(1);
        mem.pop();
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
        
        if (val != game.get_bitarr(arr, num)) {
          mem.ck = false;
          mem.pop();
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
        mem.byte();
        mem.byte();
        mem.ushort();
        break;

      case 0x27:
        debug("Calc2");
        mem.byte();
        mem.byte();
        mem.byte();
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
        debug("Aot_set 不可拾取的物体--障碍物，检查物体时的信息，死尸，火");
        var npo = {};
        npo.id = mem.byte();
        npo.type = mem.byte();
        mem.s(1);
        mem.s(1);
        mem.s(1);
        npo.x = mem.short();
        npo.y = mem.short();
        npo.w = mem.short();
        npo.h = mem.short();
        mem.s(1);
        mem.s(1);
        mem.s(1);
        debug("Non pickable:", JSON.stringify(npo));
        break;

      case 0x2D:
        debug("Obj_model_set");
        var id = mem.byte();
        mem.s(18*2);
        break;

      case 0x2E:
        debug("Work_set");
        var component = mem.byte();
        var index = mem.byte();
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
        break;

      case 0x35:
        debug("Member_set2");
        var id = mem.byte();
        var varw = mem.byte();
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
        debug(JSON.stringify(door));
        break;

      case 0x3C:
        debug('Cut_auto');
        var screen = mem.byte();
        break;

      case 0x3D:
        debug('Member_copy');
        var varw = mem.byte();
        var id = mem.byte();
        break;

      case 0x3E:
        debug("Member_cmp");
        mem.s(2);
        var compare = mem.byte();
        var value = mem.short();
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
        debug(JSON.stringify(zb));
        break;

      case 0x45:
        debug("Col_chg_set");
        mem.s(4);
        break;

      case 0x46:
        debug("Aot_reset");
        var id = mem.byte();
        mem.s(8);
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
        debug("0x4D ?");
        mem.s(21);
        break;

      case 0x4E:
        debug("Item_aot_set");
        mem.s(21);
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
        mem.s(5);
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
        mem.s(13);
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
        mem.s(4);
        wall.x1 = mem.short();
        wall.y1 = mem.short();
        wall.x2 = mem.short();
        wall.y2 = mem.short();
        wall.x3 = mem.short();
        wall.y3 = mem.short();
        wall.x4 = mem.short();
        wall.y4 = mem.short();
        mem.s(6);
        debug("Wall", JSON.stringify(wall));
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
        debug("!!!!!!!!");
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