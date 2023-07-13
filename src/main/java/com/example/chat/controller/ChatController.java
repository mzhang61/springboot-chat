package com.example.chat.controller;


import com.example.chat.entity.TChatMessage;
import com.example.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(Principal principal, @Payload TChatMessage chatMessage) {

        if (chatMessage.getType() == TChatMessage.MessageType.CHAT) {
            chatMessageRepository.save(chatMessage.setCreateTime(LocalDateTime.now()));
        }

        if (StringUtils.isEmpty(chatMessage.getReceiver())) {
            messagingTemplate.convertAndSend("/topic/public", chatMessage);
        } else {
            messagingTemplate.convertAndSendToUser(chatMessage.getSender(), "/notification", chatMessage);
            messagingTemplate.convertAndSendToUser(chatMessage.getReceiver(), "/notification", chatMessage);

        }
    }

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public TChatMessage addUser(@Payload TChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        return chatMessage;
    }

    @SubscribeMapping("/chat.lastTenMessage")
    public List<TChatMessage> addUser(Principal principal) {
        Query query = new Query();

        Criteria criteria = new Criteria().orOperator(
                Criteria.where("receiver").is(null),
                Criteria.where("sender").is(principal.getName()),
                Criteria.where("receiver").is(principal.getName()));
        query.addCriteria(criteria)
                .with(Sort.by(Sort.Direction.DESC, "createTime"))
                .limit(10);
        List<TChatMessage> ret = mongoTemplate.find(query, TChatMessage.class);
        ret.sort(Comparator.comparing(TChatMessage::getCreateTime));
        return ret;

    }
}
