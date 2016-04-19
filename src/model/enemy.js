var SCORE_INFLATION_RATE = 20;
var EXP_INFLATION_RATE = 10;

var EnemyModel = MovableModel.extend({
    defaults:function(){
        return _.extend( MovableModel.prototype.defaults.call(this),{
            name:"",
            attackRage: 1,
            attackType: ATTACK_TYPE_MELEE,
            baseAttack: 1,
            isAllFaceSame: true,
            exp: 1,
            heroForwardAfterKillMe:true,
            score: SCORE_INFLATION_RATE
        } )
    },
    initialize:function(){
        MovableModel.prototype.initialize.call(this);
        this.__dead = false;
        this.onLevelChange();
        this.on("change:level", this.onLevelChange,this)
    },
    onLevelChange:function(){
        var l = this.get("level");
        this.set("exp",this.expOfLevel(l))
        this.set("score", this.scoreOfLevel(l) );
        this.set("baseAttack", this.attackOfLevel(l) );
    },
    expOfLevel:function(l){
        return l*EXP_INFLATION_RATE
    },
    scoreOfLevel:function(l){
        return (l+1)*l/2*SCORE_INFLATION_RATE
    },
    attackOfLevel:function(l){
        return 1;
    },
    beforeBeAttacked:function(hero){
    },
    checkHit:function(hero, options){
        return true;
    },
    getClosestPoint:function(p){
        return _.min(this.get("positions"), function(position){
            return getPointDistance(position, p )
        },this)
    },
    checkRange:function(hero){
        var heroPosition = hero.get("positions")[0];
        var range = this.get("attackRage");
        return _.any(this.get("positions"), function(position){
            return getPointDistance(position, heroPosition ) <= range
        },this)
    },
    beforeBeHit:function(hero){
    },
    beHit:function(hero){
        this.beforeBeHit(hero);
        this.trigger("beHit",this,hero);
    },
    afterBeHit:function(hero){  //called by view
        this.afterBeAttacked(hero);
        this.die(hero);
    },
    beforeDie:function(hero){
        this.__dead = true;
    },
    die:function(hero){
        this.beforeDie(hero);
        this.trigger("die",this, hero)
    },
    afterDie:function(hero){ //called by view
        currentRoom.getHero().gainExp(this.get("exp"));
        currentRoom.getScore(this.get("score"));

        currentRoom.logEnemyDie(this);
        currentRoom.removeMovable(this);
    },
    beforeDodgeAttack:function(hero){
    },
    dodgeAttack:function(hero){
        this.beforeDodgeAttack(hero);
        this.trigger("dodgeAttack",this,hero);
    },
    afterDodgeAttack:function(hero){ //called by view
        this.afterBeAttacked(hero);
    },
    afterBeAttacked:function(hero){
    },
    beforeAttack:function(hero){
    },
    canAttack:function(hero){
        //TODO other status effect
        if ( this.checkRange(hero) ) {
            return true;
        }
        return false
    },
    canBeAttack:function(attackType){
        return !this.__dead;
    },
    passAttack:function(){
        this.set("attackOver", true);
    },
    attack:function(hero){
        this.set("attackOver", false);
        hero.beforeBeAttacked(this)
        this.beforeAttack(hero);
        this.trigger("attack",this, hero)
    },
    hitOrMiss:function(hero){ //called by view
        if (hero.checkHit(this)) {
            //hit
            var attackPoint = this.hit(hero); //输出
            var damage = hero.beHit(this, attackPoint); //调整
            if ( damage > 0 ) { //能造成伤害
                damage = this.damageHero(hero, damage); //第二次调整
                hero.takeDamage(this, damage); //real damage
            } else {
                //blocked
                this.beBlocked(hero, attackPoint);
                hero.blocked(attackPoint)
            }
            return true;
        } else {
            //miss
            this.miss(hero);
            hero.dodgeAttack(this);
            return false;
        }
    },
    beforeDamageHero:function(hero, damage){
    },
    damageHero:function(hero, damage){
        this.beforeDamageHero(hero);
        return damage;
    },
    beBlocked:function(hero, attackPoint){

    },
    beforeMiss:function(hero){
    },
    miss:function(hero){
        this.beforeMiss(hero)
        this.trigger("miss",this, hero)
    },
    afterMiss:function(hero){ //called by view
    },
    beforeHit:function(hero){
    },
    hit:function(hero){
        this.beforeHit(hero)
        this.trigger("hit",this, hero)
        return this.getAttackPoint();
    },
    afterHit:function(hero){ //called by view
    },
    afterAttack:function(hero){
        this.set("attackOver", true);
        currentRoom.checkAllEnemyAttacked();
    },
    getAttackPoint:function(){
        return this.get("baseAttack") * (this.get("angry")?2:1);
    }
})

var PuddingModel = EnemyModel.extend({
    defaults:function(){
        return _.extend( EnemyModel.prototype.defaults.call(this),{
            type: "pudding"
        } )
    }
})
MOVABLE_MODEL_MAP.pudding = PuddingModel;

var CherryCakeModel = EnemyModel.extend({
    defaults:function(){
        return _.extend( EnemyModel.prototype.defaults.call(this),{
            type: "cherrycake"
        } )
    },
    expOfLevel:function(l){
        return l*EXP_INFLATION_RATE*2
    },
    attackOfLevel:function(l){
        return l;
    }
})
MOVABLE_MODEL_MAP.cherrycake = CherryCakeModel;

var RiceCakeModel = EnemyModel.extend({
    defaults:function(){
        return _.extend( EnemyModel.prototype.defaults.call(this),{
            type: "ricecake",
            isMovable: false
        } )
    },
    expOfLevel:function(l){
        return l*EXP_INFLATION_RATE*3
    },
    attackOfLevel:function(l){
        return l*3;
    }
})
MOVABLE_MODEL_MAP.ricecake = RiceCakeModel;

var ArcherModel = EnemyModel.extend({
    defaults:function(){
        return _.extend( EnemyModel.prototype.defaults.call(this),{
            type: "archer"
        } )
    },
    checkRange:function(hero){
        return true;
    },
    expOfLevel:function(l){
        return l*EXP_INFLATION_RATE*2
    },
    attackOfLevel:function(l){
        return Math.round(l/2);
    }
})
MOVABLE_MODEL_MAP.archer = ArcherModel;

var IcecreamModel = EnemyModel.extend({
    defaults:function(){
        return _.extend( EnemyModel.prototype.defaults.call(this),{
            type: "icecream"
        } )
    },
    afterBeMerged:function(movable){
        EnemyModel.prototype.afterBeMerged.call(this,movable);
        if ( movable instanceof IcecreamModel ) {
            //freeze around
            var position = this.get("positions")[0];
            _.each( INCREMENTS, function(increment){
                var model = currentRoom.getMovableByPosition(position.x+increment.x, position.y+increment.y);
                if ( model ) {
                    this.checkFreeze(model);
                }
            },this );
        }
    },
    afterHit:function(heroModel){
        this.checkFreeze(heroModel);
    },
    expOfLevel:function(l){
        return Math.round(l*EXP_INFLATION_RATE*2.5)
    },
    attackOfLevel:function(l){
        return l;
    },
    getFreezeRate:function(heroModel){
        var level = this.get("level");
        return Math.min(0.7,level*5/200+0.1);
//        return 1;
    },
    checkFreeze:function(model){
        if (this.getFreezeRate(model) > Math.random() ){
            model.getFrozen(2);
        }
    }
})
MOVABLE_MODEL_MAP.icecream = IcecreamModel;

var CreamPuffModel = EnemyModel.extend({
    defaults:function(){
        return _.extend( EnemyModel.prototype.defaults.call(this),{
            type: "creampuff"
        } )
    },
    afterBeMerged:function(movable){
        EnemyModel.prototype.afterBeMerged.call(this,movable);
        if ( movable instanceof CreamPuffModel ) {
            //angry around
            var position = this.get("positions")[0];
            _.each( INCREMENTS, function(increment){
                var model = currentRoom.getMovableByPosition(position.x+increment.x, position.y+increment.y);
                if ( model instanceof EnemyModel ) {
                     model.getAngry(1);
                }
            },this );
        }
    },
    expOfLevel:function(l){
        return (l+1)*EXP_INFLATION_RATE*2;
    },
    attackOfLevel:function(l){
        return l;
    }
})
MOVABLE_MODEL_MAP.creampuff = CreamPuffModel;

var SouffleModel = EnemyModel.extend({
    defaults:function(){
        return _.extend( EnemyModel.prototype.defaults.call(this),{
            type: "souffle"
        } )
    },
    afterBeMerged:function(movable){
        EnemyModel.prototype.afterBeMerged.call(this,movable);
        this.levelUp(1);
        if ( movable instanceof SouffleModel ) {
            //freeze around
            var position = this.get("positions")[0];
            _.each( INCREMENTS, function(increment){
                var model = currentRoom.getMovableByPosition(position.x+increment.x, position.y+increment.y);
                if ( model instanceof EnemyModel ) {
                    model.levelUp(1);
                }
            },this );
        }
    },
    expOfLevel:function(l){
        return l*EXP_INFLATION_RATE*2;
    },
    attackOfLevel:function(l){
        return l;
    }
})
MOVABLE_MODEL_MAP.souffle = SouffleModel;
