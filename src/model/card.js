var CARD_MODEL_MAP = {};
var CARD_LEVEL_ADJUST = 0;
var ORIGIN_ACTIVE_CARD_NUMBER = 2;
var ACTIVE_CARD_NUMBER = ORIGIN_ACTIVE_CARD_NUMBER;
var PASSIVE_CARD_NUMBER = 2;
var CARD_WAIT_ADJUST = 0;

var getCardName = function(type){
    return texts.card[type].name;
}
var getCardDesc = function(type, level){
    var desc = texts.card[type].desc;
    if ( typeof desc === "function" ) {
        return desc(level);
    } else return desc;
}

var getCardLevelUpDesc = function(type, level){
    var desc = texts.card[type].levelUpDesc;
    if ( typeof desc === "function" ) {
        return desc(level);
    } else return desc;
}

var CardModel = Backbone.Model.extend({
    defaults: function () {
        return {
            type: "",

            level: 1,
            maxLevel: 1,
            waitTurn: 0,
            isShowLevel: true
        }
    },
    initialize: function () {

    },
    getName:function(){
        return getCardName(this.get("type"));
    },
    getDescription:function(){
        return getCardDesc(this.get("type"), this.get("level"));
    },
    getMaxLevel:function(){
        return this.get("maxLevel")+CARD_LEVEL_ADJUST;
    },
    getWait:function(){
        return this.get("waitTurn")
    },
    reduceWait:function(amount){
        this.set("waitTurn", Math.max(0,this.get("waitTurn") - amount));
    },
    canUse:function(){
        return this.get("waitTurn") <= 0;
    },
    onGain:function(){
    },
    use:function(){
        currentRoom.blockInput();
        this.onUse();
        this.trigger("use",this);
        currentRoom.discardCard(this);
    },
    onUse:function(){
    },
    afterUse:function(){ // call by view
        currentRoom.unblockInput();
        if ( currentRoom.passCheckCondition() ) {
            currentRoom.getHero().checkLevelUp(); //maybe level up after use card
        }
        saveRoom();
    },
    onExile:function(){
    },
    onDraw:function(){
        this.set("waitTurn",this.getWaitTurnOfLevel(this.get("level")));
    },
    levelUp:function(amount){
        this.set("level",this.get("level")+amount)
        this.onLevelUp();
    },
    canLevelUp:function(){
        return this.get("level") < this.getMaxLevel()
    },
    onLevelUp:function(){

    },
    discard:function(){
        this.onDiscard();
        this.trigger("discard", this);
    },
    onDiscard:function(){
    },
    restoreToOrigin:function(){
        //TODO restore status that card buff or debuff
    },
    getWaitTurnOfLevel:function(level){
        return Math.max(0,this.waitTurnOfLevel(level || this.get("level") ) + CARD_WAIT_ADJUST);
    },
    waitTurnOfLevel:function(level){
        return 0;
    },
    disturb:function(amount){
        this.set("waitTurn",this.get("waitTurn") + amount);
    }
});

CARD_MODEL_MAP.heal = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "heal",
            maxLevel: 10
        })
    },

    onUse:function(){
        currentRoom.getHero().gainHp(CARD_MODEL_MAP.heal.getEffect(this.get("level")))
    },
    waitTurnOfLevel:function(level){
        return level+4;
    }
})
CARD_MODEL_MAP.heal.getEffect = function(level){
    level = level || 1;
    return 5*level;
}
CARD_MODEL_MAP.heal.isActive = true;

CARD_MODEL_MAP["slash"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "slash",
            maxLevel: 3
        })
    },
    waitTurnOfLevel:function(level){
        return 4-level;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        hero.set("forwardSlash",1);
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP["slash"].isActive = true;

CARD_MODEL_MAP["tail-slash"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "tail-slash",
            maxLevel: 3
        })
    },
    waitTurnOfLevel:function(level){
        return 4-level;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        var movable = currentRoom.getMovableByPosition(getDecrementPosition(hero.get("positions")[0], hero.get("face")));
        if (movable instanceof EnemyModel && movable.canBeAttack("skill")) {
            hero.attack(movable,{
                attackType : ATTACK_TYPE_MELEE,
                attackAction: "tail-slash",
                onHit: function(enemy, opt){
                    enemy.beHit(hero, opt);
                },
                onMiss: function(enemy, opt){
                    enemy.dodgeAttack(hero, opt);
                },
                context: this
            });
        }
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP["tail-slash"].isActive = true;

CARD_MODEL_MAP["vertical-fire"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "vertical-fire",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 11-level;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        var heroPosition = hero.get("positions")[0];

        var alreadyAttacked = {};
        for ( var i = 0; i < currentRoom.getHeight(); i++ ) {
            var movable = currentRoom.getMovableByPosition(heroPosition.x, i);
            if (movable instanceof EnemyModel && movable.canBeAttack("magic") && !alreadyAttacked[movable.cid]) {
                alreadyAttacked[movable.cid] = true;
                hero.attack(movable,{
                    attackType : ATTACK_TYPE_MAGIC,
                    attackAction: "fire",
                    onHit: function(enemy, opt){
                        enemy.beHit(hero, opt);
                    },
                    onMiss: function(enemy, opt){
                        enemy.dodgeAttack(hero, opt);
                    },
                    context: this
                });
            }
        }
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP["vertical-fire"].isActive = true;

CARD_MODEL_MAP["horizontal-fire"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "horizontal-fire",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 11-level;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        var heroPosition = hero.get("positions")[0];

        var alreadyAttacked = {};
        for ( var i = 0; i < currentRoom.getWidth(); i++ ) {
            var movable = currentRoom.getMovableByPosition(i,heroPosition.y);
            if (movable instanceof EnemyModel && movable.canBeAttack("magic")&& !alreadyAttacked[movable.cid]) {
                alreadyAttacked[movable.cid] = true;
                hero.attack(movable,{
                    attackType : ATTACK_TYPE_MAGIC,
                    attackAction: "fire",
                    onHit: function(enemy, opt){
                        enemy.beHit(hero, opt);
                    },
                    onMiss: function(enemy, opt){
                        enemy.dodgeAttack(hero, opt);
                    },
                    context: this
                });
            }
        }
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP["horizontal-fire"].isActive = true;

CARD_MODEL_MAP["cross-fire"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "cross-fire",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 30-level*2;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        var heroPosition = hero.get("positions")[0];

        var alreadyAttacked = {};
        for ( var i = 0; i < currentRoom.getHeight(); i++ ) {
            var movable = currentRoom.getMovableByPosition(heroPosition.x, i);
            if (movable instanceof EnemyModel && movable.canBeAttack("magic") && !alreadyAttacked[movable.cid]) {
                alreadyAttacked[movable.cid] = true;
                hero.attack(movable,{
                    attackType : ATTACK_TYPE_MAGIC,
                    attackAction: "fire",
                    onHit: function(enemy, opt){
                        enemy.beHit(hero, opt);
                    },
                    onMiss: function(enemy, opt){
                        enemy.dodgeAttack(hero, opt);
                    },
                    context: this
                });
            }
        }

        for ( var i = 0; i < currentRoom.getWidth(); i++ ) {
            var movable = currentRoom.getMovableByPosition(i,heroPosition.y);
            if (movable instanceof EnemyModel && movable.canBeAttack("magic")) {
                hero.attack(movable,{
                    attackType : ATTACK_TYPE_MAGIC,
                    attackAction: "fire",
                    onHit: function(enemy, opt){
                        enemy.beHit(hero, opt);
                    },
                    onMiss: function(enemy, opt){
                        enemy.dodgeAttack(hero, opt);
                    },
                    context: this
                });
            }
        }
    },
    onLevelUp:function(){
        this.reduceWait(2);
    }
})
CARD_MODEL_MAP["cross-fire"].isActive = true;

CARD_MODEL_MAP["whirl-slash"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "whirl-slash",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 13-level;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        var heroPosition = hero.get("positions")[0];

        var alreadyAttacked = true;
        _.each( [{ x:heroPosition.x-1, y:heroPosition.y},
                { x:heroPosition.x+1, y:heroPosition.y},
                { x:heroPosition.x, y:heroPosition.y-1},
                { x:heroPosition.x, y:heroPosition.y+1}], function(position){
                    var movable = currentRoom.getMovableByPosition(position.x, position.y);
                    if (movable instanceof EnemyModel && movable.canBeAttack("skill") && !alreadyAttacked[movable.cid]) {
                        alreadyAttacked[movable.cid] = true;
                        hero.attack(movable, {
                            attackType: ATTACK_TYPE_MELEE,
                            attackAction: "whirl-slash",
                            onHit: function (enemy, opt) {
                                enemy.beHit(hero, opt);
                            },
                            onMiss: function (enemy, opt) {
                                enemy.dodgeAttack(hero, opt);
                            },
                            context: this
                        });
                    }
                },this )
    },
    onLevelUp:function(){
        this.reduceWait(2);
    }
})
CARD_MODEL_MAP["whirl-slash"].isActive = true;

CARD_MODEL_MAP["big-whirl-slash"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "big-whirl-slash",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 27-level*2;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        var heroPosition = hero.get("positions")[0];

        var alreadyAttacked = true;
        for ( var i = heroPosition.x-1; i < heroPosition.x+2; i++ ) {
            for ( var j = heroPosition.y-1; j < heroPosition.y+2; j++ ) {
                var movable = currentRoom.getMovableByPosition(i, j);
                if (movable instanceof EnemyModel && movable.canBeAttack("skill")&&!alreadyAttacked[movable.cid]) {
                    alreadyAttacked[movable.cid] = true;
                    hero.attack(movable, {
                        attackType: ATTACK_TYPE_MELEE,
                        attackAction: "big-whirl-slash",
                        onHit: function (enemy, opt) {
                            enemy.beHit(hero, opt);
                        },
                        onMiss: function (enemy, opt) {
                            enemy.dodgeAttack(hero, opt);
                        },
                        context: this
                    });
                }
            }
        }
    },
    onLevelUp:function(){
        this.reduceWait(2);
    }
})
CARD_MODEL_MAP["big-whirl-slash"].isActive = true;

CARD_MODEL_MAP.cooldown = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "cooldown",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 0;
    },
    onUse:function(){
        var effect = CARD_MODEL_MAP.cooldown.getEffect(this.get("level"));
        _.each(currentRoom.getHand(),function(cardModel){
            cardModel.reduceWait(effect)
        },this);
    }
})
CARD_MODEL_MAP.cooldown.isActive = true;
CARD_MODEL_MAP.cooldown.getEffect = function(level){
    level = level || 1;
    return level+4;
}
CARD_MODEL_MAP.cooldown.getEffectDiff = function(currentLevel, targetLevel){
    targetLevel = targetLevel || currentLevel+1;
    return 1;
}

CARD_MODEL_MAP.dispel = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "dispel",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 8-level;
    },
    onUse:function(){
        currentRoom.getHero().dispel();
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP.dispel.isActive = true;

CARD_MODEL_MAP["fire-ball"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "fire-ball",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 7-level;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        var currentPosition = hero.get("positions")[0];
        do {
            var position = getIncrementPosition(currentPosition, hero.get("face"));
            var tile = currentRoom.getTile(position)
            if ( tile && tile.isPassable()) {
                var movable = currentRoom.getMovableByPosition(position);
                if ( movable ) {
                    if ( movable instanceof EnemyModel && movable.canBeAttack("magic") ) {
                        hero.attack(movable,{
                            attackType : ATTACK_TYPE_MAGIC,
                            attackAction: "fire",
                            onHit: function(enemy, opt){
                                enemy.beHit(hero, opt);
                            },
                            onMiss: function(enemy, opt){
                                enemy.dodgeAttack(hero, opt);
                            },
                            context: this
                        });
                        break;
                    } else {
                        break;
                    }
                }
            } else {
                break;
            }
            currentPosition = position;
        } while ( true );
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP["fire-ball"].isActive = true;

CARD_MODEL_MAP.freeze = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "freeze",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 9-level;
    },
    onUse:function(){
        currentRoom.foreachMovable(function(movableModel){
            if ( movableModel instanceof EnemyModel ) {
                movableModel.getFrozen(1);
            }
        },this)
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP.freeze.isActive = true;

CARD_MODEL_MAP.lightening = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "lightening",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 28-level*2;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        var heroPosition = hero.get("positions")[0]
        var attackEnemyModel = _.sample(_.filter(_.map( [{ x:heroPosition.x-1, y:heroPosition.y},
            { x:heroPosition.x+1, y:heroPosition.y},
            { x:heroPosition.x, y:heroPosition.y-1},
            { x:heroPosition.x, y:heroPosition.y+1}], function(position){
            return currentRoom.getMovableByPosition(position.x, position.y);
        },this ),function(movableModel){
            return movableModel instanceof EnemyModel
        }));
        if ( attackEnemyModel ) { //found one
            var attackType = attackEnemyModel.get("type");
            var attackSubtype = attackEnemyModel.get("subtype");
            _.each(currentRoom.filterMovable(function(movableModel){
                return movableModel.get("type") === attackType && movableModel.get("subtype") === attackSubtype;
            },this),function(movableModel){
                hero.attack(movableModel, {
                    attackType: ATTACK_TYPE_MAGIC,
                    attackAction: "lightening",
                    onHit: function (enemy, opt) {
                        enemy.beHit(hero, opt);
                    },
                    onMiss: function (enemy, opt) {
                        enemy.dodgeAttack(hero, opt);
                    },
                    context: this
                });
            },this);
        }
    },
    onLevelUp:function(){
        this.reduceWait(CARD_MODEL_MAP.lightening.getEffectDiff());
    }
})
CARD_MODEL_MAP.lightening.isActive = true;
CARD_MODEL_MAP.lightening.getEffectDiff = function(currentLevel, targetLevel){
    return 2;
}

CARD_MODEL_MAP["meteor-shower"] = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "meteor-shower",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 20;
    },
    onUse:function(){
        var hero = currentRoom.getHero();
        _.each( _.sample(currentRoom.filterMovable(function(movableModel){
            return movableModel instanceof EnemyModel;
        },this), CARD_MODEL_MAP["meteor-shower"].getEffect(this.get("level"))),
            function(movableModel){
                hero.attack(movableModel, {
                    attackType: ATTACK_TYPE_MAGIC,
                    attackAction: "meteor-shower",
                    onHit: function (enemy, opt) {
                        enemy.beHit(hero, opt);
                    },
                    onMiss: function (enemy, opt) {
                        enemy.dodgeAttack(hero, opt);
                    },
                    context: this
                });
            }
        ,this)
    }
})
CARD_MODEL_MAP["meteor-shower"].isActive = true;
CARD_MODEL_MAP["meteor-shower"].getEffect = function(level){
    level = level || 1;
    return level+4;
}
CARD_MODEL_MAP["meteor-shower"].getEffectDiff = function(currentLevel, targetLevel){
    return 1;
}

CARD_MODEL_MAP.teleport = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "teleport",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 13-level;
    },
    onUse:function(){
        var currentTile = currentRoom.getTile(currentRoom.getHero().get("positions")[0]);
        var tiles = currentRoom.filterTile(function(tile){
                return currentTile !== tile && tile.isPassable() && !currentRoom.getMovableByTile(tile)
            },
            this);
        if ( tiles.length ) {
            var candidate = _.sample(tiles);
            var newPosition = candidate.get("position");
            currentRoom.getHero().teleport(newPosition, false);
        }
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP.teleport.isActive = true;

CARD_MODEL_MAP.tornado = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "tornado",
            maxLevel: 5
        })
    },
    waitTurnOfLevel:function(level){
        return 10-level;
    },
    onUse:function(){
        var candidates = currentRoom.filterMovable(function(movableModel){
            return (movableModel instanceof EnemyModel || movableModel instanceof ItemModel)&&movableModel.isSinglePiece();
        },this)
        _.each(candidates,function(movableModel){
            movableModel.__removeOldMapping();
        },this);

        var targetTiles = _.sample( currentRoom.filterTile(function(tileModel){
            return tileModel.isPassable() && !currentRoom.getMovableByTile(tileModel);
        },this),candidates.length)

        var i = 0;
        _.each(candidates,function(movableModel){
            movableModel.trigger("teleport", targetTiles[i].get("position"));
            movableModel.setNewPosition(targetTiles[i].get("position"));
            i++;
        },this);
    },
    onLevelUp:function(){
        this.reduceWait(1);
    }
})
CARD_MODEL_MAP.tornado.isActive = true

//TODO stealth 隐身

//TODO throw bomb

//passive card
CARD_MODEL_MAP.collector = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "collector",
            isPassive: true,
            maxLevel: 7
        })
    },
    canLevelUp:function(){
        var hero = currentRoom.getHero();
        return CardModel.prototype.canLevelUp.call(this) && hero.get("collector") < hero.get("maxCollector")
    },
    onLevelUp:function(){
        var hero = currentRoom.getHero();
        hero.set("collector",hero.get("collector") + CARD_MODEL_MAP.collector.getEffectDiff(this.get("level")) )
    },
    onGain:function(){
        var hero = currentRoom.getHero();
        hero.set("collector",hero.get("collector") + CARD_MODEL_MAP.collector.getEffect(this.get("level")) )
    },
    onExile:function(){
        var hero = currentRoom.getHero();
        hero.set("collector",hero.get("collector") - CARD_MODEL_MAP.collector.getEffect(this.get("level")) )
    },
    onUse:function(){
        currentRoom.getHero().gainBuff("luck", CARD_MODEL_MAP.collector.getUseEffect);
    }
})
CARD_MODEL_MAP.collector.getEffect = function(level){
    level = level || 1;
    return level+1;
}
CARD_MODEL_MAP.collector.getEffectDiff = function(currentLevel, targetLevel){
    targetLevel = targetLevel || currentLevel+1;
    return 1;
}
CARD_MODEL_MAP.collector.getUseEffect = 2;

CARD_MODEL_MAP.constitution = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "constitution",
            isPassive: true,
            maxLevel: 50
        })
    },
    onLevelUp:function(){
        var hero = currentRoom.getHero();
        var currentMaxHp = hero.get("maxHp");
        hero.set("constitution",hero.get("constitution")+1);
        hero.calculateMaxHp();
        var diff = hero.get("maxHp") - currentMaxHp;
        hero.set("hp", hero.get("hp") + diff );
    },
    onGain:function(){
        var hero = currentRoom.getHero();
        var currentMaxHp = hero.get("maxHp");
        hero.set("constitution",hero.get("constitution")+(this.get("level")+1));
        hero.calculateMaxHp();
        var diff = hero.get("maxHp") - currentMaxHp;
        hero.set("hp", hero.get("hp") + diff );
    },
    onExile:function(){
        var hero = currentRoom.getHero();
        hero.set("constitution",hero.get("constitution")-(this.get("level")+1));
        hero.set("hp",Math.min(hero.get("hp"), hero.get("maxHp") ) )
    },
    onUse:function(){
        currentRoom.getHero().gainHp(CARD_MODEL_MAP.constitution.getUseEffect);
    }
})
CARD_MODEL_MAP.constitution.getEffect = function(level){
    level = level || 1;
    return Math.round((level+1)*CONSTITUTION_EFFECT);
}
CARD_MODEL_MAP.constitution.getEffectDiff = function(currentLevel, targetLevel){
    targetLevel = targetLevel || currentLevel+1;
    return CARD_MODEL_MAP.constitution.getEffect(targetLevel) - CARD_MODEL_MAP.constitution.getEffect(currentLevel);
}
CARD_MODEL_MAP.constitution.getUseEffect = 2;

CARD_MODEL_MAP.cunning = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "cunning",
            isPassive: true,
            maxLevel: 14
        })
    },
    canLevelUp:function(){
        var hero = currentRoom.getHero();
        return CardModel.prototype.canLevelUp.call(this) && hero.get("cunning") < hero.get("maxCunning")
    },
    onLevelUp:function(){
        var hero = currentRoom.getHero();
        hero.set("cunning",hero.get("cunning") + CARD_MODEL_MAP.cunning.getEffectDiff(this.get("level")) )
        //recalculate require exp
        hero.set({
            requireExp: hero.requireExpOfLevel(hero.get("level"))
        });
    },
    onGain:function(){
        var hero = currentRoom.getHero();
        hero.set("cunning",hero.get("cunning") + CARD_MODEL_MAP.cunning.getEffect(this.get("level")) )
        //recalculate require exp
        hero.set({
            requireExp: hero.requireExpOfLevel(hero.get("level"))
        });
    },
    onExile:function(){
        var hero = currentRoom.getHero();
        hero.set("cunning",hero.get("cunning") - CARD_MODEL_MAP.cunning.getEffect(this.get("level")) )
        //recalculate require exp
        hero.set({
            requireExp: hero.requireExpOfLevel(hero.get("level"))
        });
    },
    onUse:function(){
        currentRoom.getHero().gainExp(CARD_MODEL_MAP.cunning.getUseEffect);
    }
})
CARD_MODEL_MAP.cunning.getEffect = function(level){
    level = level || 1;
    return level+2;
}
CARD_MODEL_MAP.cunning.getEffectDiff = function(currentLevel, targetLevel){
    targetLevel = targetLevel || currentLevel+1;
    return 1;
}
CARD_MODEL_MAP.cunning.getUseEffect = 5;

CARD_MODEL_MAP.dexterity = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "dexterity",
            isPassive: true,
            maxLevel: 10
        })
    },
    canLevelUp:function(){
        var hero = currentRoom.getHero();
        return CardModel.prototype.canLevelUp.call(this) && hero.get("dexterity") < hero.get("maxDexterity")
    },
    onLevelUp:function(){
        var hero = currentRoom.getHero();
        hero.set("dexterity",hero.get("dexterity") + CARD_MODEL_MAP.dexterity.getEffectDiff(this.get("level")) )
    },
    onGain:function(){
        var hero = currentRoom.getHero();
        hero.set("dexterity",hero.get("dexterity") + CARD_MODEL_MAP.dexterity.getEffect(this.get("level")) )
    },
    onExile:function(){
        var hero = currentRoom.getHero();
        hero.set("dexterity",hero.get("dexterity") - CARD_MODEL_MAP.dexterity.getEffect(this.get("level")) )
    },
    onUse:function(){
        currentRoom.getHero().gainBuff("dexterity", CARD_MODEL_MAP.dexterity.getUseEffect);
    }
})
CARD_MODEL_MAP.dexterity.getEffect = function(level){
    level = level || 1;
    return level*2+1;
}
CARD_MODEL_MAP.dexterity.getEffectDiff = function(currentLevel, targetLevel){
    targetLevel = targetLevel || currentLevel+1;
    return 2;
}
CARD_MODEL_MAP.dexterity.getUseEffect = 3;

CARD_MODEL_MAP.dodge = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "dodge",
            isPassive: true,
            maxLevel: 10
        })
    },
    canLevelUp:function(){
        var hero = currentRoom.getHero();
        return CardModel.prototype.canLevelUp.call(this) && hero.get("dodge") < hero.get("maxDodge")
    },
    onLevelUp:function(){
        var hero = currentRoom.getHero();
        hero.set("dodge",hero.get("dodge") + CARD_MODEL_MAP.dodge.getEffectDiff(this.get("level")) )
    },
    onGain:function(){
        var hero = currentRoom.getHero();
        hero.set("dodge",hero.get("dodge") + CARD_MODEL_MAP.dodge.getEffect(this.get("level")) )
    },
    onExile:function(){
        var hero = currentRoom.getHero();
        hero.set("dodge",hero.get("dodge") - CARD_MODEL_MAP.dodge.getEffect(this.get("level")) )
    },
    onUse:function(){
        currentRoom.getHero().gainBuff("dodge", CARD_MODEL_MAP.dodge.getUseEffect);
    }
})
CARD_MODEL_MAP.dodge.getEffect = function(level){
    level = level || 1;
    return level*3+2;
}
CARD_MODEL_MAP.dodge.getEffectDiff = function(currentLevel, targetLevel){
    targetLevel = targetLevel || currentLevel+1;
    return 3;
}
CARD_MODEL_MAP.dodge.getUseEffect = 3;

CARD_MODEL_MAP.luck = CardModel.extend({
    defaults: function () {
        return _.extend(CardModel.prototype.defaults.call(this),{
            type: "luck",
            isPassive: true,
            maxLevel: 7
        })
    },
    canLevelUp:function(){
        var hero = currentRoom.getHero();
        return CardModel.prototype.canLevelUp.call(this) && hero.get("luck") < hero.get("maxLuck")
    },
    onLevelUp:function(){
        var hero = currentRoom.getHero();
        hero.set("luck",hero.get("luck") + CARD_MODEL_MAP.luck.getEffectDiff(this.get("level")) )
    },
    onGain:function(){
        var hero = currentRoom.getHero();
        hero.set("luck",hero.get("luck") + CARD_MODEL_MAP.luck.getEffect(this.get("level")) )
    },
    onExile:function(){
        var hero = currentRoom.getHero();
        hero.set("luck",hero.get("luck") - CARD_MODEL_MAP.luck.getEffect(this.get("level")) )
    },
    onUse:function(){
        currentRoom.getHero().gainBuff("luck", CARD_MODEL_MAP.luck.getUseEffect);
    }
})
CARD_MODEL_MAP.luck.getEffect = function(level){
    level = level || 1;
    return level*2+1;
}
CARD_MODEL_MAP.luck.getEffectDiff = function(currentLevel, targetLevel){
    targetLevel = targetLevel || currentLevel+1;
    return 2;
}
CARD_MODEL_MAP.luck.getUseEffect = 3;
