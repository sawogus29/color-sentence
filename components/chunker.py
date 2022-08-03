from spacy.tokens import Token, Span, Doc
from spacy.language import Language

@Language.component("chunk_component")
def chunk_component(doc):
    def _chunk(sent):
        root = find_root(sent)
        if root and root.pos_ in verb_like:
            verb_handler(root)

    for sent in doc.sents:
        _chunk(sent)
    return doc

def find_root(doc):
    for token in doc:
        if token.dep_ == 'ROOT':
            return token
    return None

def register_self_to_tokens(span, cls):
    for token in span:
        token._.parent_chunk.append((span, cls))

def verb_handler(token):
    def expand_verb(token):
        # TODO: 
        # - expand to verbal-MWE
        # - common subj, obj of multiple verb
        if token.dep_ == 'xcomp':
            return

        children_and_self = list(token.lefts) + [token] + list(token.rights)
        spans = []
        span = None
        for child in children_and_self:
            if dep_to_group.get(child.dep_, None) == 'verb' or child == token:
                # print('this is expand', child)
                if span is None:
                    span = (child.i, child.i+1)
                elif span[1] == child.i:
                    span = (span[0], child.i+1)
                else:
                    spans.append(span)
                    span = (child.i, child.i+1)
            
            # Special Case: xcomp
            if child.dep_ == 'xcomp':
                # recursive
                if token.lemma_ == "be":
                    comp_handler(child)
                else:
                    verb_handler(child)
                    if span is not None:
                        span = (span[0], child.i+1)
            
        
        if span is not None:
            spans.append(span)
        
        for span in spans:
            v_span = token.doc[slice(*span)]
            # v_span._.mytag = 'verb'
            register_self_to_tokens(v_span, 'verb')

    if token.pos_ in verb_like:
        # if token.dep_ == 'xcomp', exapnd_verb() returns immediately
        expand_verb(token)

    for child in token.children:
        # print(child)
        group = dep_to_group.get(child.dep_, None)
        if group == 'verb' or child.dep_ == 'xcomp':
            continue

        handlers.get(group, dummy_handler)(child)

        if child.dep_ in recursive:
            verb_handler(child)

def obj_handler(token):
    span = token.doc[token.left_edge.i: token.right_edge.i+1]
    register_self_to_tokens(span, 'obj')

def subj_handler(token):
    span = token.doc[token.left_edge.i: token.right_edge.i+1]
    register_self_to_tokens(span, 'subj')

def comp_handler(token):
    span = token.doc[token.left_edge.i: token.right_edge.i+1]
    register_self_to_tokens(span, 'comp')

def aux_handler(token):
    span = token.doc[token.left_edge.i: token.right_edge.i+1]
    register_self_to_tokens(span, 'aux')

def dummy_handler(token):
    pass

def doc_generate_html(doc, word_tag=False):
    buffer = []
    for sent in doc.sents:
        buffer.append(generate_html(sent, word_tag))
    return ''.join(buffer)

def generate_html(sent, word_tag=False):
    def cls2tag(cls, attrs=None):
        attr_str=''
        if attrs is not None:
            attr_strings = [f'{k}="{v}"' for k, v in attrs.items()]
            attr_str = ' '.join(attr_strings)

        return f'<span class="{cls}" {attr_str}>', '</span>'
    buffer = []
    stack = []

    start_tag, end_tag = cls2tag('sent')
    buffer.append(start_tag)
    stack.append(end_tag)
    for token in sent:
        for p, p_cls in token._.parent_chunk:
            if p[0] == token:
                start_tag, end_tag = cls2tag(p_cls)
                buffer.append(start_tag)
                stack.append(end_tag)
        
        if word_tag:
            start_tag, end_tag = cls2tag('word')
            buffer.append(start_tag)
            buffer.append(token.text)
            buffer.append(end_tag)
        else:
            buffer.append(token.text)

        for p, p_cls in token._.parent_chunk:
            if p[-1] == token:
                _end_tag = stack.pop()
                buffer.append(end_tag)

        buffer.append(token.whitespace_)
    _end_tag = stack.pop()
    buffer.append(_end_tag)

    return ''.join(buffer)

group_to_dep = {'subj':['csubj', 'nsubj', 'csubjpass', 'nsubjpass'], 
            'verb':['aux', 'neg', 'auxpass'],
            'obj': ['dative', 'dobj'],
            'comp': ['attr', 'acomp'],
            'aux': ['prep', 'pcomp', 'advcl', 'relcl', 'agent', 'advmod', 'dep', 'ccomp']}
            
dep_to_group = {v: k for k, vs in group_to_dep.items() \
                     for v in vs}

recursive = set(['conj', 'advcl', 'ccomp'])
verb_like = set(['VERB', 'AUX'])

handlers = {'subj':subj_handler, 'obj':obj_handler,
            'comp':comp_handler, 'aux': aux_handler}

Token.set_extension('parent_chunk', default=list(), force=True)
Doc.set_extension('generate_html', method=doc_generate_html, force=True)
Span.set_extension('generate_html', method=generate_html, force=True)