/*
Copyright (C) 2012 Jason Hendry <jason@rain.com.au>

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS 
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR 
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER 
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function($){
  $.fn.editInPlace = function() {
    var NBSP = String.fromCharCode(0xa0);
    var splitAddTag = function(range,node,tag) {
      var cur = node;
      var nxt = $(document.createElement(tag))
      var text = range.startContainer.nodeValue.substr(range.startOffset).replace(/^ */,'');
      if(text === '') {
        text = NBSP;
      }
      nxt.text(text);
      nxt.insertAfter(cur);
      range.startContainer.nodeValue = range.startContainer.nodeValue.substr(0,range.startOffset).replace(/ *$/,'');
      if(text === NBSP) {
        newSelection(nxt.contents()[0],0,1)
      } else {
        newSelection(nxt.contents()[0],0)
      }
    }
    /**
     * Make a new selection
     */
    var newSelection = function(obj,start/*,obj1|end,end*/) {
      var newRange = rangy.createRange();
      newRange.setStart(obj,start);
      if(typeof arguments[2] == 'object')
        newRange.setEnd(arguments[2],argument[3]);
      else if(typeof arguments[2] == 'number')
        newRange.setEnd(obj,arguments[2]);
      rangy.getSelection().setSingleRange(newRange); 
    }
    /**
     * Handle when enter/return key is pressed
     */
    var keyEnter = function(event) {
      var selRange = rangy.getSelection().getRangeAt(0);
      console.log(selRange.startContainer,selRange.startOffset,selRange.startContainer.nodeType,selRange.startContainer.previousSibling,selRange.collapsed);
      if(selRange.startContainer.nodeType === 3) {
        var pnn = selRange.startContainer.parentNode.nodeName.toLowerCase();
        var node = $(selRange.startContainer.parentNode);
      } else if(selRange.collapsed) {
        var pnn = selRange.startContainer.nodeName.toLowerCase()  
        var node = $(selRange.startContainer);
      }
      if(pnn === 'h1' || pnn === 'h2' || pnn === 'h3' || pnn === 'h4') {
        splitAddTag(selRange,node,'p');            
        return false;
      }
      if(pnn === 'p') {
        // If at start of text node and previous node is br
        // Remove br and move text node to new p
        if(selRange.startContainer.nodeType === 3 && selRange.startOffset === 0 
          && selRange.startContainer.previousSibling 
          && selRange.startContainer.previousSibling.nodeName.toLowerCase() == 'br') {
            $(selRange.startContainer.previousSibling).remove();
            var newp = $(document.createElement('p'));
            // Move everything after selected node to next p
            while(selRange.startContainer.nextSibling)
              newp.append(selRange.startContainer.nextSibling);
            // move selected node to next p
            newp.prepend(selRange.startContainer);
            newp.insertAfter(node);
            var newRange = rangy.createRange();
            newRange.setStart(newp[0].childNodes[0],0); 
            rangy.getSelection().setSingleRange(newRange); 
            return false;
        } else {
          // Single newline create a br tag and continue in current paragraph
          var newText = '';
          var hl=false;
          if(selRange.startContainer.nodeType === 3) {
            newText = selRange.startContainer.nodeValue.substr(selRange.startOffset).replace(/^ */,'');
            selRange.startContainer.nodeValue = selRange.startContainer.nodeValue.substr(0,selRange.startOffset).replace(/ *$/,'');
          }
          if(newText === '') {
            newText = String.fromCharCode(0xa0); // = nbsp
            hl=true;
          }
          var tn = document.createTextNode(newText);
          $(selRange.startContainer).after(document.createElement('br'), tn);
          var newRange = rangy.createRange();
          newRange.setStart(tn,0); 
          if(hl) {
            newRange.setEnd(tn,1); 
          }
          rangy.getSelection().setSingleRange(newRange); 
          return false;
        }
          
      }
      if(pnn === 'li') {
        if(node.text() === '' || node.text() === NBSP) {
          var p = $(document.createElement('p'));
          var txt = document.createTextNode(String.fromCharCode(0xa0)); // = nbsp
          p.append(txt);
          node.parent('ul,ol').after(p);
          node.remove();
          var newRange = rangy.createRange();
          newRange.setStart(txt,0);
          newRange.setEnd(txt,1);
          rangy.getSelection().setSingleRange(newRange); 
        } else {
          splitAddTag(selRange,node,'li');
        }
        return false;
      }
    }
    /**
     * Handle when spacebar is pressed
     */
    var keySpace = function(event) {
      var selRange = rangy.getSelection().getRangeAt(0);
      if(selRange.startContainer.nodeType === 3 && selRange.collapsed) {
        console.log('Magic? ',selRange.startContainer.nodeValue);
        if(selRange.startContainer.nodeValue.match(/^(#+|1\.|\-|\*)$/)) {
          switch(selRange.startContainer.nodeValue[0]) {
            case '#':
              var cur = $(selRange.startContainer.parentNode);
              var h = $(document.createElement('h'+selRange.startContainer.nodeValue.length));
              h.text(String.fromCharCode(0xa0));
              cur.after(h);
              cur.remove();
              newSelection(h.contents()[0],0,1);
              return false;
            case '1':
            case '-':
            case '*':
              var cur = $(selRange.startContainer.parentNode);
              var l = $(document.createElement(selRange.startContainer.nodeValue[0]==='1'?'ol':'ul'));
              var li = $(document.createElement('li'));
              l.append(li);
              li.text(String.fromCharCode(0xa0));
              cur.after(l);
              cur.remove();
              newSelection(li.contents()[0],0,1);
              return false;
          }
        }
      }
    }
    var keyBracket = function(event) {
      var selRange = rangy.getSelection().getRangeAt(0);
      if(selRange.startContainer.nodeType === 3 && selRange.collapsed) {
        var i = selRange.startOffset-1;
        var cont = selRange.startContainer;
        var str = '';
        // Walking back from selection to open [ in current text node
        while(1) {
           if(i>=0) {
             str = cont.nodeValue[i] + str;
           } else {
             break; 
           }
           if(str[0] == '[') {
             break; 
           }
           i--;
        }
        if(str[0] == '[') {
          var contents = str.substr(1);
          if(contents == 'img') {
             return true;
          }
          if(contents == 'map') {
             return true;
          }
          // Make link
          if(i>0) {
            var before = cont.nodeValue.substr(0,i);
          } else {
            var before = '';
          }
          var after = cont.nodeValue.substr(selRange.startOffset);
          var link = $(document.createElement('a'));
          link.attr('href',contents.toLowerCase().replace(/[ ]/g,'-'));
          link.text(contents);
          link.click(clickLink);
          cont.nodeValue = before;
          if(cont.nextSibling) {
            if(cont.nextSibling.nodeType === 3) {
              cont.nextSibling.nodeValue = after+cont.nextSibling.nodeValue;
            } else if(after!=='') {
              var t = document.createTextNode(after)
              cont.parentNode.insertBefore(t,cont.nextSibling);
            }
            cont.parentNode.insertBefore(link[0],cont.nextSibling);
          } else {
            $(cont.parentNode).append(link,after); 
          }
          newSelection(link[0].childNodes[0],link.text().length);
          console.log(cont,i,contents,before,after,$(cont).index(),link);
          return false;
        }
      }
    }
    var clickLink = function(event) {
      var linkHelper = $(document.createElement('span'));
      $('body').append(linkHelper);
      var pos = $(this).offset();
      pos.top+=20;
      linkHelper.css('border','1px solid blue').css('padding','3px').css('background-color','#fff').css('width','auto').css('position','absolute');
      linkHelper.offset(pos);
      linkHelper.append('Goto: ',$(this).clone());
      setTimeout(function() {
        linkHelper.remove();
      }, 3000);
    }
    if(this.text()==='') {
      this.append('<p>Click here to start editing</p>');
    }
    this.attr('contentEditable','true');
    this.keypress(function(event){
      console.log(event.keyCode);
        if(event.keyCode == 13) { // newline
          return keyEnter(event);
        }
        if(event.keyCode == 32) { // space
          return keySpace(event);
        }
        if(event.keyCode == 93) { // ] closing square bracket
          return keyBracket(event);
        }
        
      });
    this.find('a').click(clickLink);
    this.find('.map').attr('contentEditable','false').each(function(){
      var mapHelper = $(document.createElement('span'));
      $('body').append(mapHelper);
      var pos = $(this).offset();
      pos.top+=$(this).height();
      mapHelper.css('border','1px solid blue').css('padding','3px').css('background-color','#fff').css('width','auto').css('position','absolute');
      mapHelper.offset(pos);
      mapHelper.append('Remove Map');
    });
    
    // Allow drag and drop files
    if(!$(document).data('DND_Enabled')) {
      $(document).data('DND_Enabled',true);
      console.log('run once');
      var dropbox = document.getElementById("dropbox")
 
      var dragEnter = function(evt) {
        console.log(evt.target);
        evt.stopPropagation();
        evt.preventDefault();
      }
      var dragOver = function(evt) {
        $('.edit').addClass('editinplace-dropable');
        evt.stopPropagation();
        evt.preventDefault();
      }
      var dragExit = function(evt) {
        $('.edit').removeClass('editinplace-dropable');
        evt.preventDefault();
      }
      var drop = function(evt) {
        
        evt.stopPropagation();
        evt.preventDefault();
        var files = evt.dataTransfer.files;
        var count = files.length;
         
        // Only call the handler if 1 or more files was dropped.
        if (count > 0) {
          console.log(files);
        }
      }
 
      // init event handlers
      document.addEventListener("dragenter", dragEnter, false);
      document.addEventListener("dragexit", dragExit, false);
      document.addEventListener("dragover", dragOver, false);
      document.addEventListener("drop", drop, false);
      
    }
    
    
  };
})(jQuery);









